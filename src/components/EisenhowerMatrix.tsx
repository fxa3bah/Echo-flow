import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Circle } from 'lucide-react'
import { db } from '../lib/db'
import { cn } from '../lib/utils'
import type { Entry, Priority } from '../types'

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

export function EisenhowerMatrix() {
  const todos = useLiveQuery(() =>
    db.entries
      .where('type')
      .equals('todo')
      .and(entry => !entry.completed)
      .toArray(),
    []
  )

  const handleToggleComplete = async (entry: Entry) => {
    await db.entries.update(entry.id, {
      completed: !entry.completed,
      updatedAt: new Date(),
    })
  }

  const handleChangePriority = async (entry: Entry, newPriority: Priority) => {
    await db.entries.update(entry.id, {
      priority: newPriority,
      updatedAt: new Date(),
    })
  }

  const getTasksByPriority = (priority: Priority): Entry[] => {
    if (!todos) return []
    return todos.filter((todo) => (todo.priority || 'not-urgent-not-important') === priority)
  }

  const priorities: Priority[] = [
    'urgent-important',
    'not-urgent-important',
    'urgent-not-important',
    'not-urgent-not-important',
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Eisenhower Matrix</h2>
        <p className="text-muted-foreground">
          Organize your tasks by urgency and importance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {priorities.map((priority) => {
          const tasks = getTasksByPriority(priority)
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
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </p>
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No tasks in this quadrant
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-card border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="text-green-500" size={18} />
                          ) : (
                            <Circle className="text-muted-foreground" size={18} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h4
                            className={cn(
                              'text-sm font-medium',
                              task.completed && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.title}
                          </h4>
                          {task.content && task.content !== task.title && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.content}
                            </p>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick priority change buttons */}
                      <div className="flex gap-1 pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground mr-1">Move:</span>
                        {priorities
                          .filter((p) => p !== priority)
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => handleChangePriority(task, p)}
                              className={cn(
                                'text-xs px-2 py-0.5 rounded hover:bg-accent transition-colors',
                                quadrantInfo[p].textColor
                              )}
                              title={`Move to ${quadrantInfo[p].title}`}
                            >
                              {quadrantInfo[p].title}
                            </button>
                          ))}
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
