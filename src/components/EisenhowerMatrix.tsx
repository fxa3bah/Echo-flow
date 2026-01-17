import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Sparkles, Loader2, Calendar } from 'lucide-react'
import { db } from '../lib/db'
import { cn } from '../lib/utils'
import type { Priority } from '../types'
import { analyzeAllDataForMatrix } from '../services/matrixAI'

type DateFilter = 'today' | 'last-3-days' | 'this-week' | 'last-week' | 'last-month' | 'future' | 'all'

interface AnalyzedItem {
  id: string
  title: string
  content: string
  date: Date
  priority: Priority
  tags: string[]
  source: 'transcription' | 'entry' | 'diary'
  completed?: boolean
}

const quadrantInfo = {
  'urgent-important': {
    title: 'Do First',
    subtitle: 'Urgent & Important',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/20',
    textColor: 'text-red-700 dark:text-red-400',
  },
  'not-urgent-important': {
    title: 'Schedule',
    subtitle: 'Not Urgent & Important',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  'urgent-not-important': {
    title: 'Delegate',
    subtitle: 'Urgent & Not Important',
    bgColor: 'bg-yellow-500/5',
    borderColor: 'border-yellow-500/20',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  'not-urgent-not-important': {
    title: 'Eliminate',
    subtitle: 'Not Urgent & Not Important',
    bgColor: 'bg-gray-500/5',
    borderColor: 'border-gray-500/20',
    textColor: 'text-gray-700 dark:text-gray-400',
  },
}

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All Items' },
  { value: 'today', label: 'Today' },
  { value: 'last-3-days', label: 'Last 3 Days' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'future', label: 'Future' },
]

export function EisenhowerMatrix() {
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [error, setError] = useState<string | null>(null)

  // Run AI analysis on mount
  useEffect(() => {
    runAnalysis()
  }, [])

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const items = await analyzeAllDataForMatrix()
      setAnalyzedItems(items)
    } catch (err: any) {
      console.error('Failed to analyze data:', err)
      setError(err.message || 'Failed to analyze data. Please check your Groq API key.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const filterItemsByDate = (items: AnalyzedItem[]): AnalyzedItem[] => {
    if (dateFilter === 'all') return items

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return items.filter((item) => {
      const itemDate = new Date(item.date)
      const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())

      switch (dateFilter) {
        case 'today':
          return itemDay.getTime() === today.getTime()

        case 'last-3-days': {
          const threeDaysAgo = new Date(today)
          threeDaysAgo.setDate(today.getDate() - 3)
          return itemDay >= threeDaysAgo && itemDay <= today
        }

        case 'this-week': {
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
          return itemDay >= weekStart && itemDay <= today
        }

        case 'last-week': {
          const lastWeekEnd = new Date(today)
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1) // Last Saturday
          const lastWeekStart = new Date(lastWeekEnd)
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6) // Last Sunday
          return itemDay >= lastWeekStart && itemDay <= lastWeekEnd
        }

        case 'last-month': {
          const monthAgo = new Date(today)
          monthAgo.setMonth(today.getMonth() - 1)
          return itemDay >= monthAgo && itemDay <= today
        }

        case 'future':
          return itemDay > today

        default:
          return true
      }
    })
  }

  const getItemsByPriority = (priority: Priority): AnalyzedItem[] => {
    const filteredByDate = filterItemsByDate(analyzedItems)
    return filteredByDate.filter((item) => item.priority === priority)
  }

  const handleToggleComplete = async (item: AnalyzedItem) => {
    if (item.source === 'entry') {
      await db.entries.update(item.id, {
        completed: !item.completed,
        updatedAt: new Date(),
      })
      // Refresh analysis
      runAnalysis()
    }
  }

  const formatItemDate = (date: Date): string => {
    const now = new Date()
    const itemDate = new Date(date)
    const diffTime = now.getTime() - itemDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays === -1) return 'Tomorrow'
    if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 0 && diffDays > -7) return `In ${Math.abs(diffDays)} days`

    return itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const priorities: Priority[] = [
    'urgent-important',
    'not-urgent-important',
    'urgent-not-important',
    'not-urgent-not-important',
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Eisenhower Matrix</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered task categorization by urgency and importance
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                {dateFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                isAnalyzing && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze with AI
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {priorities.map((priority) => {
          const tasks = getItemsByPriority(priority)
          const info = quadrantInfo[priority]

          return (
            <div
              key={priority}
              className={cn(
                'border-2 rounded-lg p-4 min-h-64',
                info.bgColor,
                info.borderColor
              )}
            >
              <div className="mb-4">
                <h3 className={cn('text-lg font-bold', info.textColor)}>
                  {info.title}
                </h3>
                <p className="text-sm text-muted-foreground">{info.subtitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isAnalyzing && tasks.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No items in this quadrant
                  </p>
                ) : (
                  tasks.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        {item.source === 'entry' && (
                          <button
                            onClick={() => handleToggleComplete(item)}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="text-green-500" size={18} />
                            ) : (
                              <Circle className="text-muted-foreground" size={18} />
                            )}
                          </button>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={cn(
                                'text-sm font-medium',
                                item.completed && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.title}
                            </h4>
                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                              {formatItemDate(item.date)}
                            </span>
                          </div>

                          {item.content && item.content !== item.title && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.content}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {item.source}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
