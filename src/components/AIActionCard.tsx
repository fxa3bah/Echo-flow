import { useState } from 'react'
import { CheckCircle2, X, Edit3, Calendar as CalendarIcon, Tag as TagIcon, CheckSquare, Clock, FileText, BookOpen } from 'lucide-react'
import { cn } from '../lib/utils'
import type { AIAction } from '../services/aiActions'

interface AIActionCardProps {
  action: AIAction
  onAccept: (action: AIAction) => void
  onReject: () => void
  isRejected?: boolean
}

const actionIcons = {
  todo: CheckSquare,
  reminder: Clock,
  note: FileText,
  journal: BookOpen,
}

const actionColors = {
  todo: 'border-green-500 bg-green-50 dark:bg-green-950/30',
  reminder: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  note: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30',
  journal: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
}

export function AIActionCard({ action, onAccept, onReject, isRejected }: AIActionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedAction, setEditedAction] = useState(action)
  const [editedTags, setEditedTags] = useState((action.tags || []).join(', '))

  const Icon = actionIcons[action.type]
  const formatDateTimeLocal = (date: Date) => {
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60 * 1000)
    return local.toISOString().slice(0, 16)
  }

  const handleSave = () => {
    const updatedAction = {
      ...editedAction,
      tags: editedTags.split(',').map((t) => t.trim()).filter(Boolean),
    }
    onAccept(updatedAction)
    setIsEditing(false)
  }

  const handleAccept = () => {
    onAccept(editedAction)
  }

  if (isRejected) {
    return (
      <div className={cn('border-l-4 rounded p-3 opacity-50', actionColors[action.type])}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm line-through text-muted-foreground">{action.title}</span>
          <span className="ml-auto text-xs text-destructive">Rejected</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border-l-4 rounded p-3', actionColors[action.type])}>
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={editedAction.title}
              onChange={(e) => setEditedAction({ ...editedAction, title: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Content</label>
            <textarea
              value={editedAction.content}
              onChange={(e) => setEditedAction({ ...editedAction, content: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-border rounded bg-background resize-none"
              rows={2}
            />
          </div>
          {(action.type === 'todo' || action.type === 'reminder') && (
            <div>
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="datetime-local"
                value={editedAction.date ? formatDateTimeLocal(new Date(editedAction.date)) : ''}
                onChange={(e) =>
                  setEditedAction({ ...editedAction, date: e.target.value ? new Date(e.target.value) : undefined })
                }
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={editedTags}
              onChange={(e) => setEditedTags(e.target.value)}
              placeholder="work, important, project"
              className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Save & Accept
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{action.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{action.content}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {action.date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(action.date).toLocaleDateString()} {new Date(action.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {action.tags && action.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <TagIcon className="w-3 h-3 text-muted-foreground" />
                    {action.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-background rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button
              onClick={handleAccept}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title="Accept (a)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Edit (e)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors ml-auto"
              title="Reject (r)"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
