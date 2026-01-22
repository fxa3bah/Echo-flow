import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, CheckCircle2, Circle, Clock, Tag as TagIcon, StickyNote } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, isSameDay, cn, ensureDate, ensureString } from '../lib/utils'
import type { Entry } from '../types'
import { TiptapEditor } from './TiptapEditor'

export function DiaryEditor() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [quickAddKey, setQuickAddKey] = useState(0)

  // Get all entries for selected date from UNIFIED table
  const allDayData = useLiveQuery(async () => {
    const all = await db.entries.toArray()
    return all.filter((e) => {
      const entryDate = ensureDate(e.date)
      return entryDate ? isSameDay(entryDate, selectedDate) : false
    })
  }, [selectedDate])

  // Sort entries by creation time
  const sortedEntries = allDayData?.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ) || []

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Delete this entry?')) {
      await db.entries.delete(id)
    }
  }

  const handleUpdateContent = async (id: string, newContent: string) => {
    await db.entries.update(id, {
      content: newContent,
      updatedAt: new Date(),
    })
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    await db.entries.update(id, { completed: !completed })
  }

  const handleCreateNote = async (content: string) => {
    if (!content.trim() || content === '<p></p>') return

    const newEntry: Entry = {
      id: crypto.randomUUID(),
      type: 'diary',
      source: 'diary',
      date: selectedDate,
      content: content,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    }
    await db.entries.add(newEntry)
  }

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    setSelectedDate(next)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{formatDate(selectedDate)}</h1>
          <p className="text-muted-foreground mt-1">Daily Journal</p>
        </div>

        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl">
          <button onClick={goToPreviousDay} className="p-2 hover:bg-background rounded-lg transition-all" title="Previous Day">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToToday} className="px-4 py-2 text-sm font-medium hover:bg-background rounded-lg transition-all">
            Today
          </button>
          <button onClick={goToNextDay} className="p-2 hover:bg-background rounded-lg transition-all" title="Next Day">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Unified Journal Feed */}
      <div className="space-y-8 mb-40 min-h-[50vh] relative pl-4">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl text-muted-foreground ml-8">
            <p>No entries for this day yet.</p>
            <p className="text-sm mt-1">Record a note or start typing below.</p>
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <div key={entry.id} className="journal-item group relative">
              <div className="flex items-start gap-6">
                <div className="mt-1 flex-shrink-0 z-10 bg-background p-1 -ml-1">
                  {entry.type === 'voice' && <MessageSquare size={16} className="text-blue-500" />}
                  {entry.type === 'todo' && (
                    <button onClick={() => handleToggleTodo(entry.id, entry.completed || false)}>
                      {entry.completed ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <Circle size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </button>
                  )}
                  {entry.type === 'reminder' && <Clock size={16} className="text-purple-500" />}
                  {entry.type === 'diary' && <StickyNote size={16} className="text-orange-500" />}
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="journal-timestamp">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {entry.source === 'voice' && <span className="text-[10px] text-blue-500/50 font-bold uppercase tracking-wider">Voice</span>}
                  </div>

                  {entry.type === 'diary' ? (
                    <div className="space-y-1">
                      {entry.title && (
                        <p className="text-base sm:text-lg leading-tight font-black text-foreground mb-1.5">
                          {entry.title}
                        </p>
                      )}
                      <TiptapEditor
                        content={ensureString(entry.content)}
                        onChange={(val) => handleUpdateContent(entry.id, val)}
                        placeholder="Captured thought..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className={cn(
                        "text-base sm:text-lg leading-tight font-black text-foreground tracking-tight",
                        entry.completed && "line-through text-muted-foreground/30"
                      )}>
                        {entry.title ? (
                          entry.title
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} className="prose prose-sm dark:prose-invert max-w-none inline" />
                        )}
                      </div>
                      {entry.title && entry.content &&
                        entry.content.toLowerCase().trim() !== entry.title.toLowerCase().trim() && (
                          <div className={cn(
                            "text-sm font-medium text-muted-foreground/80 leading-relaxed font-black tracking-tight",
                            entry.completed && "line-through opacity-30"
                          )}>
                            <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} className="prose prose-sm dark:prose-invert max-w-none" />
                          </div>
                        )}
                    </div>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {entry.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md opacity-70">
                          <TagIcon size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="absolute right-0 top-0 p-2 text-muted-foreground/0 group-hover:text-destructive/30 hover:text-destructive transition-all rounded-md"
                  title="Delete entry"
                >
                  <TagIcon size={14} className="rotate-45" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Entry Box */}
      <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-3 ring-1 ring-black/5 dark:ring-white/5">
          <TiptapEditor
            key={quickAddKey}
            content=""
            onChange={() => { }}
            onEnter={(val) => {
              handleCreateNote(val)
              setQuickAddKey(p => p + 1)
            }}
            placeholder="Write a new block..."
          />
          <div className="flex justify-between items-center mt-2 px-1 border-t border-border/30 pt-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Quick Add</span>
            </div>
            <span className="text-[10px] text-muted-foreground/50 italic">Enter to log</span>
          </div>
        </div>
      </div>
    </div>
  )
}
