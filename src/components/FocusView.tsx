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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Focus View</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
              isRefreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-organized tasks by time horizon
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {timeHorizons.map((horizon) => {
          const Icon = horizon.icon
          const sectionEntries = entries?.filter((e) => horizon.filter(e, now)) || []

          return (
            <div
              key={horizon.id}
              className={cn(
                'rounded-lg border p-4 sm:p-6 transition-all',
                horizon.color
              )}
            >
              <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">{horizon.title}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">{horizon.description}</p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 bg-background rounded-full whitespace-nowrap">
                  {sectionEntries.length} {sectionEntries.length === 1 ? 'task' : 'tasks'}
                </div>
              </div>

              {sectionEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  No tasks in this time horizon
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {sectionEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleComplete(entry)}
                        className="mt-0.5 sm:mt-1 flex-shrink-0"
                      >
                        {entry.completed ? (
                          <CheckCircle2 className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          <Circle className="text-muted-foreground hover:text-primary w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {(() => {
                          const entryContent = ensureString(entry.content)
                          return (
                            <>
                              <h3 className="font-medium text-sm sm:text-base">
                                {entry.title || entryContent.substring(0, 60)}
                              </h3>
                              {entry.title && entryContent !== entry.title && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {entryContent}
                                </p>
                              )}
                            </>
                          )
                        })()}

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                          {(() => {
                            const entryDate = ensureDate(entry.date)
                            return entryDate ? (
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span className="hidden sm:inline">{entryDate.toLocaleDateString()} {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="sm:hidden">{entryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : null
                          })()}
                          {(entry.tags || []).length > 0 && (entry.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 sm:px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] sm:text-xs"
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
