import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, StickyNote, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { db } from '../lib/db'
import { formatDate, isSameDay, startOfDay, endOfDay, cn, ensureDate, ensureString, stripHtml } from '../lib/utils'
import type { Entry } from '../types'
import { TiptapEditor } from './TiptapEditor'

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)

  // Get all entries for selected date from UNIFIED table
  const allDayEntries = useLiveQuery(async () => {
    const start = startOfDay(selectedDate)
    const end = endOfDay(selectedDate)
    return db.entries
      .where('date')
      .between(start, end, true, true)
      .toArray()
  }, [selectedDate])

  const sortedEntries = allDayEntries?.sort((a: Entry, b: Entry) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) || []

  // Get all entries for the current month to show indicators
  const monthEntries = useLiveQuery(async () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59)
    return db.entries
      .where('date')
      .between(start, end, true, true)
      .toArray()
  }, [currentMonth])

  const handleToggleComplete = async (entry: Entry) => {
    await db.entries.update(entry.id, {
      completed: !entry.completed,
      updatedAt: new Date(),
    })
  }

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Permanently delete this record?')) {
      await db.entries.delete(id)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const hasEntriesOnDate = (date: Date): boolean => {
    return Boolean(
      monthEntries?.some((entry) => {
        const entryDate = ensureDate(entry.date)
        return entryDate ? isSameDay(entryDate, date) : false
      })
    )
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const handleAddNote = async (content: string) => {
    const trimmed = stripHtml(content).trim()
    if (!trimmed) return

    await db.entries.add({
      id: crypto.randomUUID(),
      type: 'note',
      source: 'manual',
      title: trimmed.slice(0, 50),
      content: content,
      date: selectedDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      linkedEntryIds: [],
    })
    setNewNoteContent('')
    setEditorKey(prev => prev + 1)
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-[1200px]">
        {/* Modern Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">

          {/* LEFT: The Navigator (Sticky on Desktop) */}
          <aside className="lg:sticky lg:top-8 space-y-4 animate-in slide-in-from-left duration-700">
            <div className="px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-primary/60">Perspective Search</span>
              <h1 className="text-3xl font-bold tracking-tighter text-foreground mt-1">Chronicle</h1>
            </div>

            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[32px] p-5 shadow-2xl shadow-black/5 dark:shadow-white/5 ring-1 ring-black/5 dark:ring-white/5">
              {/* Month Selector */}
              <div className="flex items-center justify-between mb-6 px-1">
                <button onClick={goToPreviousMonth} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30 mb-0.5">{currentMonth.getFullYear()}</span>
                  <span className="text-lg font-bold tracking-tight">{currentMonth.toLocaleDateString('en-US', { month: 'long' })}</span>
                </div>
                <button onClick={goToNextMonth} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 mb-6">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/20 uppercase py-1">{d}</div>
                ))}
                {days.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />
                  const isSelected = isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, new Date())
                  const hasEntries = hasEntriesOnDate(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all relative",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105 z-10"
                          : "hover:bg-muted text-muted-foreground",
                        isToday && !isSelected && "ring-2 ring-primary/20 bg-primary/5 text-primary"
                      )}
                    >
                      {day.getDate()}
                      {hasEntries && (
                        <div className={cn(
                          "absolute bottom-1.5 w-1 h-1 rounded-full",
                          isSelected ? "bg-white" : "bg-primary/40"
                        )} />
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={goToToday}
                className="w-full py-3.5 bg-muted/30 hover:bg-muted rounded-2xl text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground transition-all"
              >
                Jump to Today
              </button>
            </div>

            {/* Dynamic Summary Card */}
            <div className="hidden lg:block bg-primary/5 border border-primary/10 rounded-[32px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <CalendarIcon size={14} className="text-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Journal Vitals</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center sm:text-left">
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold tracking-tight">{monthEntries?.length || 0}</div>
                  <div className="text-[9px] font-semibold uppercase text-muted-foreground/50 tracking-widest">Monthly Echos</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold tracking-tight">{sortedEntries.length}</div>
                  <div className="text-[9px] font-semibold uppercase text-muted-foreground/50 tracking-widest">Daily Records</div>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: The Canvas (Day View) */}
          <main className="space-y-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
            {/* Selected Date Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5em]">Active Perspective</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-foreground">
                  {formatDate(selectedDate)}
                </h2>
              </div>
            </div>

            {/* Unified Interaction Box */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[40px] p-6 sm:p-10 shadow-2xl shadow-black/5 dark:shadow-white/5 ring-1 ring-black/5 dark:ring-white/5 transition-all focus-within:shadow-primary/5 focus-within:-translate-y-1">
              <div className="flex items-center gap-3 mb-6">
                <Plus size={18} className="text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Annotate this day</span>
              </div>

              <div className="min-h-[140px]">
                <TiptapEditor
                  key={editorKey}
                  content={newNoteContent}
                  onChange={setNewNoteContent}
                  onEnter={handleAddNote}
                  placeholder="Start typing a memory or action..."
                />
              </div>

              <div className="flex justify-between items-center mt-8 pt-8 border-t border-border/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-semibold">Memory Sync Active</p>
                </div>
                <button
                  onClick={() => handleAddNote(newNoteContent)}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Commit Note
                </button>
              </div>
            </div>

            {/* Day Timeline */}
            <div className="space-y-8 py-4">
              {sortedEntries.length === 0 ? (
                <div className="text-center py-12 bg-card/10 rounded-[32px] border-2 border-dashed border-border/10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-[20px] bg-background border border-border/50 mb-4 text-muted-foreground/10">
                    <StickyNote size={24} />
                  </div>
                  <h3 className="text-xl font-black text-foreground/20 tracking-tight">Zero traces found</h3>
                  <p className="text-xs text-muted-foreground/30 font-medium mt-1">Log your first thought for this perspective above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedEntries.map((entry: Entry) => (
                    <div key={entry.id} className="group flex gap-6">
                      {/* Time marker */}
                      <div className="hidden sm:flex flex-col items-end pt-1 w-20 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[8px] font-black uppercase text-primary/60 tracking-tighter mt-0.5">{entry.type}</span>
                      </div>

                      {/* Content block */}
                      <div className="flex-1 space-y-2">
                        <div className={cn(
                          "text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight",
                          entry.completed && "line-through opacity-20"
                        )}>
                          {entry.title ? stripHtml(entry.title) : (
                            <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} className="prose prose-sm dark:prose-invert max-w-none inline" />
                          )}
                        </div>

                        {entry.title && entry.content && stripHtml(entry.content) !== stripHtml(entry.title) && (
                          <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug text-muted-foreground/80",
                            entry.completed && "line-through opacity-10"
                          )}>
                            <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} />
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          {entry.type === 'todo' && (
                            <button
                              onClick={() => handleToggleComplete(entry)}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                entry.completed
                                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50"
                              )}
                            >
                              {entry.completed ? "Achieved" : "Commit"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-destructive/30 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
