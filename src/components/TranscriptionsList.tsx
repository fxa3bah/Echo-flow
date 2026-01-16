import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, Trash2, Tag } from 'lucide-react'
import { useState } from 'react'
import { db } from '../lib/db'
import { formatDateTime, cn } from '../lib/utils'
import type { Transcription, EntryCategory } from '../types'

const categoryColors: Record<EntryCategory, string> = {
  journal: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  todo: 'bg-green-500/10 text-green-700 dark:text-green-400',
  reminder: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  note: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
}

export function TranscriptionsList() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const transcriptions = useLiveQuery(
    () => db.transcriptions.orderBy('createdAt').reverse().toArray(),
    []
  )

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transcription?')) {
      await db.transcriptions.delete(id)
    }
  }

  const handleEdit = (transcription: Transcription) => {
    setEditingId(transcription.id)
    setEditText(transcription.text)
  }

  const handleSaveEdit = async (id: string) => {
    await db.transcriptions.update(id, {
      text: editText,
      updatedAt: new Date(),
    })
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  if (!transcriptions || transcriptions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Transcriptions</h2>
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            No transcriptions yet. Start recording to see them here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Transcriptions</h2>

      <div className="space-y-4">
        {transcriptions.map((transcription) => (
          <div
            key={transcription.id}
            className="bg-card border border-border rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {transcription.category && (
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        categoryColors[transcription.category]
                      )}
                    >
                      {transcription.category}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(transcription.createdAt)}
                  </span>
                </div>

                {/* Tags */}
                {transcription.tags && transcription.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {transcription.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(transcription)}
                  className="p-2 hover:bg-accent rounded transition-colors"
                  aria-label="Edit"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(transcription.id)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            {editingId === transcription.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(transcription.id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-foreground whitespace-pre-wrap">
                {transcription.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
