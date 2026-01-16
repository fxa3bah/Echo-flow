import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { useState } from 'react'
import { db } from '../lib/db'
import { formatDate, isSameDay, startOfDay, endOfDay, cn } from '../lib/utils'
import type { Entry, EntryCategory } from '../types'

const categoryColors: Record<EntryCategory, string> = {
  journal: 'border-l-blue-500',
  todo: 'border-l-green-500',
  reminder: 'border-l-yellow-500',
  note: 'border-l-purple-500',
}

export function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Get entries for selected date
  const entries = useLiveQuery(async () => {
    const start = startOfDay(selectedDate)
    const end = endOfDay(selectedDate)
    return db.entries
      .where('date')
      .between(start, end, true, true)
      .toArray()
  }, [selectedDate])

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
    if (confirm('Are you sure you want to delete this entry?')) {
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

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const hasEntriesOnDate = (date: Date): boolean => {
    if (!monthEntries) return false
    return monthEntries.some((entry) => isSameDay(entry.date, date))
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

  const days = getDaysInMonth(currentMonth)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const hasEntries = hasEntriesOnDate(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative',
                    'hover:bg-accent',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    isToday && !isSelected && 'ring-2 ring-primary'
                  )}
                >
                  <span className="text-sm font-medium">{day.getDate()}</span>
                  {hasEntries && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-current" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Daily View */}
        <div>
          <h3 className="text-2xl font-bold mb-4">{formatDate(selectedDate)}</h3>

          {!entries || entries.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <p className="text-muted-foreground">No entries for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'bg-card border-l-4 border-border rounded-lg p-4',
                    categoryColors[entry.type]
                  )}
                >
                  <div className="flex items-start gap-3">
                    {entry.type === 'todo' && (
                      <button
                        onClick={() => handleToggleComplete(entry)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {entry.completed ? (
                          <CheckCircle2 className="text-green-500" size={20} />
                        ) : (
                          <Circle className="text-muted-foreground" size={20} />
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          'font-medium mb-1',
                          entry.completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {entry.title}
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {entry.content}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
