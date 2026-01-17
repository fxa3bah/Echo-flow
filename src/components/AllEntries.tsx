import { useState, useEffect, useMemo } from 'react'
import { Trash2, Calendar as CalendarIcon, Tag as TagIcon, CheckSquare, Square } from 'lucide-react'
import { db } from '../lib/db'
import { cn } from '../lib/utils'
import type { Transcription, Entry, DiaryEntry } from '../types'

type UnifiedEntry = {
  id: string
  date: Date
  type: 'transcription' | 'todo' | 'reminder' | 'note' | 'journal' | 'diary'
  content: string
  tags: string[]
  completed?: boolean
  source: 'voice' | 'ai-chat' | 'diary'
}

type SortField = 'date' | 'type' | 'content'
type SortDirection = 'asc' | 'desc'

export function AllEntries() {
  const [entries, setEntries] = useState<UnifiedEntry[]>([])
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')

  // Load all data from all tables
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      const [transcriptions, dbEntries, diaryEntries] = await Promise.all([
        db.transcriptions.toArray(),
        db.entries.toArray(),
        db.diaryEntries.toArray(),
      ])

      const unified: UnifiedEntry[] = [
        // Transcriptions (voice recordings)
        ...transcriptions.map((t: Transcription) => ({
          id: t.id,
          date: t.createdAt,
          type: 'transcription' as const,
          content: t.text,
          tags: t.tags || [],
          source: 'voice' as const,
        })),

        // Entries (todos, reminders, notes from AI)
        ...dbEntries.map((e: Entry) => ({
          id: e.id,
          date: e.date || e.createdAt,
          type: e.type,
          content: e.content,
          tags: e.tags || [],
          completed: e.completed,
          source: 'ai-chat' as const,
        })),

        // Diary entries
        ...diaryEntries.map((d: DiaryEntry) => ({
          id: d.id,
          date: d.date,
          type: 'diary' as const,
          content: d.content,
          tags: [],
          source: 'diary' as const,
        })),
      ]

      setEntries(unified)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  // Sort entries
  const sortedEntries = useMemo(() => {
    let filtered = entries

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.content.toLowerCase().includes(query) ||
          e.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = a.date.getTime() - b.date.getTime()
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'content':
          comparison = a.content.localeCompare(b.content)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [entries, sortField, sortDirection, searchQuery])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDelete = async (id: string, type: UnifiedEntry['type']) => {
    if (!confirm('Delete this entry?')) return

    try {
      if (type === 'transcription') {
        await db.transcriptions.delete(id)
      } else if (type === 'diary') {
        await db.diaryEntries.delete(id)
      } else {
        await db.entries.delete(id)
      }
      await loadAllData()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await db.entries.update(id, { completed: !completed })
      await loadAllData()
    } catch (error) {
      console.error('Failed to update:', error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'todo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'note':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'journal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'diary':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'transcription':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">All Entries</h1>
        <p className="text-muted-foreground">
          All your data in one place - {sortedEntries.length} total entries
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search content or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Date
                  {sortField === 'date' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Type
                  {sortField === 'type' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort('content')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Content
                  {sortField === 'content' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium">Tags</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No entries match your search' : 'No entries yet. Start recording or add notes!'}
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  {/* Date */}
                  <td className="p-3 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div>{entry.date.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getTypeColor(entry.type))}>
                      {entry.type}
                    </span>
                  </td>

                  {/* Content */}
                  <td className="p-3">
                    <div className="flex items-start gap-2">
                      {(entry.type === 'todo' || entry.type === 'reminder') && (
                        <button
                          onClick={() => handleToggleComplete(entry.id, entry.completed || false)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {entry.completed ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <p
                        className={cn(
                          'text-sm line-clamp-2',
                          entry.completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {entry.content}
                      </p>
                    </div>
                  </td>

                  {/* Tags */}
                  <td className="p-3">
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                          >
                            <TagIcon className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(entry.id, entry.type)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {sortedEntries.length} of {entries.length} entries
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
    </div>
  )
}
