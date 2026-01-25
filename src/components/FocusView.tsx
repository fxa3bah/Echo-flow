import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Calendar, Moon, Trash2, ArrowRightLeft, Edit3, AlertCircle, Inbox, Clock } from 'lucide-react'
import { db } from '../lib/db'
import { cn, ensureDate, ensureString, stripHtml } from '../lib/utils'
import type { Entry } from '../types'
import { useState } from 'react'

type HorizonId = 'now' | 'week' | 'later'

interface TimeHorizon {
  id: HorizonId
  title: string
  description: string
  icon: any
  color: string
  accent: string
}

const timeHorizons: TimeHorizon[] = [
  {
    id: 'now',
    title: 'Focus Now',
    description: 'Next 24 Hours',
    icon: Flame,
    color: 'from-orange-500/10 to-transparent',
    accent: 'text-orange-500'
  },
  {
    id: 'week',
    title: 'This Week',
    description: 'Upcoming Sync',
    icon: Calendar,
    color: 'from-blue-500/10 to-transparent',
    accent: 'text-blue-500'
  },
  {
    id: 'later',
    title: 'Horizon',
    description: 'Future Traces',
    icon: Moon,
    color: 'from-purple-500/10 to-transparent',
    accent: 'text-purple-500'
  },
]

export function FocusView() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<Partial<Entry>>({})

  const allEntries = useLiveQuery(async () => {
    return db.entries
      .filter((entry) => (entry.type === 'todo' || entry.type === 'reminder') && !entry.completed)
      .toArray()
  }, [])

  const now = new Date()

  const getBucket = (entry: Entry): HorizonId => {
    const entryDate = ensureDate(entry.date)
    if (!entryDate) return 'later'
    const daysDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff <= 1) return 'now'
    if (daysDiff <= 7) return 'week'
    return 'later'
  }

  const handleDelete = async (id: string) => {
    if (confirm('Permanently remove this task?')) {
      await db.entries.delete(id)
    }
  }

  const handleMove = async (entry: Entry, target: HorizonId) => {
    let newDate: Date | undefined
    if (target === 'now') newDate = new Date()
    else if (target === 'week') newDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    else newDate = undefined // Clear date for Later

    await db.entries.update(entry.id, {
      date: newDate,
      updatedAt: new Date()
    })
  }

  const handleStartEdit = (entry: Entry) => {
    setEditingId(entry.id)
    setEditBuffer({ title: entry.title, content: entry.content })
  }

  const handleSaveEdit = async (id: string) => {
    await db.entries.update(id, {
      ...editBuffer,
      updatedAt: new Date()
    })
    setEditingId(null)
  }

  const handleToggleComplete = async (entry: Entry) => {
    await db.entries.update(entry.id, {
      completed: !entry.completed,
      updatedAt: new Date(),
    })
  }

  return (
    <div className="container mx-auto px-4 lg:px-12 py-6 sm:py-12 max-w-[1400px]">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top duration-700">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.5em]">Cognitive Load</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-foreground drop-shadow-sm">
            Focus Mode
          </h2>
        </div>
        <div className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 backdrop-blur-sm">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-1">Active Traces</div>
          <div className="text-2xl font-bold tracking-tighter">{allEntries?.length || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {timeHorizons.map((horizon) => {
          const sectionEntries = allEntries?.filter(e => getBucket(e) === horizon.id) || []
          const Icon = horizon.icon

          return (
            <div key={horizon.id} className="space-y-6">
              {/* Box Header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={horizon.accent} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/40">{horizon.description}</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{horizon.title}</h3>
                </div>
                <div className="text-[10px] font-bold px-3 py-1 bg-muted/40 rounded-full">{sectionEntries.length}</div>
              </div>

              {/* Box Content */}
              <div className={cn(
                "min-h-[400px] rounded-[40px] border border-border/40 bg-card/40 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/5 dark:shadow-white/5 space-y-4 transition-all",
                sectionEntries.length === 0 && "border-dashed opacity-50 bg-transparent"
              )}>
                {sectionEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                    <div className="p-4 bg-muted/10 rounded-full text-muted-foreground/20">
                      <Inbox size={32} />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground/40 leading-relaxed uppercase tracking-widest">Horizon Clear</p>
                  </div>
                ) : (
                  sectionEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="group bg-background/50 backdrop-blur-sm border border-border/20 rounded-3xl p-5 hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
                    >
                      {editingId === entry.id ? (
                        <div className="space-y-4">
                          <input
                            value={editBuffer.title}
                            onChange={e => setEditBuffer({ ...editBuffer, title: e.target.value })}
                            className="w-full bg-background border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary"
                            placeholder="Title"
                          />
                          <textarea
                            value={editBuffer.content}
                            onChange={e => setEditBuffer({ ...editBuffer, content: e.target.value })}
                            className="w-full bg-background border-none rounded-xl px-3 py-2 text-xs h-20 resize-none"
                            placeholder="Details"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(entry.id)} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">Save Change</button>
                            <button onClick={() => setEditingId(null)} className="px-4 bg-muted py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => handleToggleComplete(entry)}
                              className="w-5 h-5 mt-0.5 rounded-full border-2 border-primary/20 flex items-center justify-center hover:border-primary transition-all group-hover:bg-primary/5 shrink-0"
                            >
                              <div className="w-2 h-2 rounded-full bg-primary scale-0 group-hover:scale-50 transition-all" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold tracking-tight leading-tight line-clamp-2">{entry.title || stripHtml(ensureString(entry.content)).substring(0, 40)}</div>
                              {entry.title && entry.content && stripHtml(ensureString(entry.content)) !== entry.title && (
                                <p className="text-[11px] text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">{stripHtml(ensureString(entry.content))}</p>
                              )}

                              <div className="flex flex-wrap gap-3 mt-3">
                                {entry.date && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary/60 uppercase tracking-tight">
                                    <Clock size={10} />
                                    {ensureDate(entry.date)?.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-border/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                            <div className="flex items-center bg-muted/30 rounded-xl p-1 gap-1">
                              {timeHorizons.map(h => h.id !== horizon.id && (
                                <button
                                  key={h.id}
                                  onClick={() => handleMove(entry, h.id)}
                                  className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground/40 hover:text-primary"
                                  title={`Move to ${h.title}`}
                                >
                                  <ArrowRightLeft size={12} />
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleStartEdit(entry)}
                              className="p-2 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                              title="Quick Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="ml-auto p-2 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
                              title="Discard Trace"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pro Tip Area */}
      <div className="mt-12 p-8 bg-card/40 backdrop-blur-xl border border-border/40 rounded-[40px] flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
          <AlertCircle size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold tracking-tight">Focus Logic Sync</h4>
          <p className="text-xs text-muted-foreground/60 leading-relaxed uppercase tracking-widest font-semibold max-w-2xl">
            Focus mode dynamically buckets your traces into time horizons. Items moved to "Focus Now" are prioritized for delivery in the next 24 hours. Items without a timestamp flow into your Horizon Backlog.
          </p>
        </div>
      </div>
    </div>
  )
}
