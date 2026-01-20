import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Circle, Clock, Flame, Calendar, Moon, RefreshCw } from 'lucide-react'
import { db } from '../lib/db'
import { cn, ensureDate, ensureString } from '../lib/utils'
import type { Entry } from '../types'
import { useState } from 'react'

interface TimeHorizonSection {
  id: 'now' | 'week' | 'later'
  title: string
  description: string
  icon: typeof Flame
  color: string
  filter: (entry: Entry, now: Date) => boolean
}

const timeHorizons: TimeHorizonSection[] = [
  {
    id: 'now',
    title: 'Do Now',
    description: 'Next 24 hours',
    icon: Flame,
    color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    filter: (entry, now) => {
      const entryDate = ensureDate(entry.date)
      if (!entryDate) return false
      const hoursDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursDiff >= -24 && hoursDiff <= 24
    },
  },
  {
    id: 'week',
    title: 'This Week',
    description: 'Next 7 days',
    icon: Calendar,
    color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    filter: (entry, now) => {
      const entryDate = ensureDate(entry.date)
      if (!entryDate) return false
      const daysDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff > 1 && daysDiff <= 7
    },
  },
  {
    id: 'later',
    title: 'Later',
    description: 'Backlog',
    icon: Moon,
    color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
    filter: (entry, now) => {
      const entryDate = ensureDate(entry.date)
      if (!entryDate) return true // No date = backlog
      const daysDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff > 7
    },
  },
]

export function FocusView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const entries = useLiveQuery(async () => {
    return db.entries
      .filter((entry) => (entry.type === 'todo' || entry.type === 'reminder') && !entry.completed)
      .toArray()
  }, [refreshKey])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Force a refresh of the query
    setRefreshKey(prev => prev + 1)
    // Small delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleToggleComplete = async (entry: Entry) => {
    await db.entries.update(entry.id, {
      completed: !entry.completed,
      updatedAt: new Date(),
    })
  }

  const now = new Date()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Focus View</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
              isRefreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
        <p className="text-muted-foreground">
          AI-organized tasks by time horizon
        </p>
      </div>

      <div className="space-y-6">
        {timeHorizons.map((horizon) => {
          const Icon = horizon.icon
          const sectionEntries = entries?.filter((e) => horizon.filter(e, now)) || []

          return (
            <div
              key={horizon.id}
              className={cn(
                'rounded-lg border p-6 transition-all',
                horizon.color
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-semibold">{horizon.title}</h2>
                    <p className="text-sm text-muted-foreground">{horizon.description}</p>
                  </div>
                </div>
                <div className="text-sm font-medium px-3 py-1 bg-background rounded-full">
                  {sectionEntries.length} {sectionEntries.length === 1 ? 'task' : 'tasks'}
                </div>
              </div>

              {sectionEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tasks in this time horizon
                </p>
              ) : (
                <div className="space-y-2">
                  {sectionEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleComplete(entry)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {entry.completed ? (
                          <CheckCircle2 className="text-green-500" size={20} />
                        ) : (
                          <Circle className="text-muted-foreground hover:text-primary" size={20} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {(() => {
                          const entryContent = ensureString(entry.content)
                          return (
                            <>
                              <h3 className="font-medium">
                                {entry.title || entryContent.substring(0, 60)}
                              </h3>
                              {entry.title && entryContent !== entry.title && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {entryContent}
                                </p>
                              )}
                            </>
                          )
                        })()}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {(() => {
                            const entryDate = ensureDate(entry.date)
                            return entryDate ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {entryDate.toLocaleDateString()} {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ) : null
                          })()}
                          {(entry.tags || []).length > 0 && (entry.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                          {entry.type === 'reminder' && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                              Reminder
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Pro tip:</strong> Focus on completing tasks in "Do Now" before moving to later sections.
          AI automatically categorizes tasks based on due dates - no manual prioritization needed!
        </p>
      </div>
    </div>
  )
}
