import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Tag as TagIcon, Plus, Sparkles } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, isSameDay, cn, ensureDate, ensureString, stripHtml } from '../lib/utils'
import type { Entry } from '../types'
import { TiptapEditor } from './TiptapEditor'

export function DiaryEditor() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [newEntryContent, setNewEntryContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)

  const allDayData = useLiveQuery(async () => {
    const all = await db.entries.toArray()
    return all.filter((e) => {
      const entryDate = ensureDate(e.date)
      return entryDate ? isSameDay(entryDate, selectedDate) : false
    })
  }, [selectedDate])

  const sortedEntries = allDayData?.sort((a: Entry, b: Entry) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || []

  const handleCreateNote = async (content: string) => {
    const trimmed = stripHtml(content).trim()
    if (!trimmed) return

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
    setNewEntryContent('')
    setEditorKey(prev => prev + 1)
  }

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
    <div className="min-h-screen bg-background">
      {/* Top Background Decoration */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent -z-10" />

      <div className="container mx-auto px-6 max-w-3xl py-12 sm:py-24 animate-in fade-in duration-700">
        {/* Navigation & Date */}
        <header className="flex flex-col items-center text-center space-y-10 mb-20 sm:mb-32">
          <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <button onClick={goToPreviousDay} className="p-2.5 hover:bg-background rounded-xl transition-all active:scale-90" title="Previous Day">
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <button onClick={goToToday} className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-background rounded-xl transition-all active:scale-95 text-muted-foreground hover:text-foreground">
              {isSameDay(selectedDate, new Date()) ? 'Today' : 'Back to Today'}
            </button>
            <button onClick={goToNextDay} className="p-2.5 hover:bg-background rounded-xl transition-all active:scale-90" title="Next Day">
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-8xl font-black tracking-tighter text-foreground leading-[0.8] drop-shadow-sm">
              {formatDate(selectedDate)}
            </h1>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-muted-foreground/40 ml-1">
              Personal Chronicle
            </p>
          </div>
        </header>

        {/* Main Interaction Area - Premium Top-Down Flow */}
        <div className="space-y-24">
          {/* New Entry Capture Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-[42px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-[40px] p-6 sm:p-10 shadow-2xl shadow-black/5 dark:shadow-white/5 transition-all focus-within:shadow-primary/5 focus-within:-translate-y-1">
              <div className="flex items-center gap-3 mb-8 text-primary">
                <Sparkles size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Capture your first thought...</span>
              </div>

              <div className="min-h-[120px]">
                <TiptapEditor
                  key={editorKey}
                  content={newEntryContent}
                  onChange={setNewEntryContent}
                  onEnter={handleCreateNote}
                  placeholder="Start typing your day..."
                />
              </div>

              <div className="flex justify-between items-center mt-8 pt-8 border-t border-border/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                  {sortedEntries.length} items logged today
                </p>
                <button
                  onClick={() => handleCreateNote(newEntryContent)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  Log Entry
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-20 relative">
            {sortedEntries.length > 0 && (
              <div className="absolute left-1/2 -ml-[1px] top-4 bottom-20 w-[2px] bg-gradient-to-b from-border/50 via-border to-transparent -z-10" />
            )}

            {sortedEntries.map((entry: Entry, idx: number) => (
              <div key={entry.id} className="group relative flex flex-col items-center">
                {/* Visual Anchor */}
                <div className="w-4 h-4 rounded-full bg-background border-4 border-border/80 group-hover:border-primary transition-all duration-500 z-10 mb-8" />

                <div className="w-full space-y-4">
                  <div className="flex flex-col items-center text-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 bg-muted/30 px-3 py-1 rounded-full">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="w-full max-w-xl space-y-4 px-4">
                      {entry.type === 'diary' ? (
                        <div className="space-y-4">
                          {entry.title && (
                            <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter leading-[0.9]">
                              {stripHtml(entry.title)}
                            </h2>
                          )}
                          <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none text-center prose-p:leading-relaxed prose-p:text-foreground/80">
                            <TiptapEditor
                              content={ensureString(entry.content)}
                              onChange={(val) => handleUpdateContent(entry.id, val)}
                              placeholder="..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className={cn(
                            "text-2xl sm:text-4xl leading-[0.9] font-black tracking-tighter text-foreground px-4",
                            entry.completed && "line-through text-muted-foreground/20"
                          )}>
                            {entry.title ? (
                              stripHtml(entry.title)
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} className="prose prose-base sm:prose-lg dark:prose-invert max-w-none inline" />
                            )}
                          </div>

                          {entry.type === 'todo' && (
                            <button
                              onClick={() => handleToggleTodo(entry.id, entry.completed || false)}
                              className={cn(
                                "mx-auto px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] border transition-all active:scale-95 inline-flex items-center gap-3",
                                entry.completed
                                  ? "bg-emerald-500 text-white border-transparent shadow-xl shadow-emerald-500/20"
                                  : "bg-background border-border hover:border-primary/50 text-muted-foreground/60 hover:text-primary"
                              )}
                            >
                              {entry.completed ? 'Achieved' : 'Mark as Achieved'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Entry Tags & Delete */}
                      <div className="flex flex-col items-center gap-6 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap justify-center">
                            {entry.tags.map((tag: string) => (
                              <span key={tag} className="flex items-center gap-1.5 text-[8px] px-3 py-1 bg-secondary/50 text-muted-foreground/60 border border-border/30 rounded-lg font-black uppercase tracking-widest">
                                <TagIcon size={8} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-destructive/40 hover:text-destructive transition-all"
                        >
                          Discard Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vertical Step Divider */}
                {idx !== sortedEntries.length - 1 && (
                  <div className="h-20 w-[1px] bg-border/20 mt-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
