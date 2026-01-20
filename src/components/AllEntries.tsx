import { useState, useEffect, useMemo } from 'react'
import { Trash2, Calendar as CalendarIcon, Tag as TagIcon, CheckSquare, Square, SquarePen, SlidersHorizontal, X } from 'lucide-react'
import { db } from '../lib/db'
import { cn, ensureDate, ensureString } from '../lib/utils'
import type { Entry } from '../types'

type SortField = 'date' | 'type' | 'content' | 'source'
type SortDirection = 'asc' | 'desc'

export function AllEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [editedTags, setEditedTags] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDate, setBulkDate] = useState('')
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [inlineEditDraft, setInlineEditDraft] = useState({
    title: '',
    content: '',
    date: '',
  })

  const stripAiActionLines = (text: string) =>
    ensureString(text)
      .split('\n')
      .filter((line) => !line.trim().startsWith('### AI Actions'))
      .join('\n')

  // Load all data from unified table
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      // Simple! Just one table query
      const allEntries = await db.entries.toArray()
      const cleanedEntries = allEntries
        .filter((entry) => {
          const content = ensureString(entry.content)
          if (!content.trim().startsWith('### AI Actions')) return true
          db.entries.delete(entry.id).catch(console.error)
          return false
        })
        .map((entry) => {
          const content = ensureString(entry.content)
          if (entry.type === 'diary') {
            const cleanedContent = stripAiActionLines(content)
            if (cleanedContent !== content) {
              db.entries.update(entry.id, {
                content: cleanedContent,
                updatedAt: new Date(),
              }).catch(console.error)
              return { ...entry, content: cleanedContent }
            }
          }
          return { ...entry, content }
        })
      setEntries(cleanedEntries)
      setSelectedIds((prev) => {
        const next = new Set<string>()
        const validIds = new Set(cleanedEntries.map((entry) => entry.id))
        prev.forEach((id) => {
          if (validIds.has(id)) {
            next.add(id)
          }
        })
        return next
      })
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
          ensureString(e.content).toLowerCase().includes(query) ||
          (e.title && e.title.toLowerCase().includes(query)) ||
          (e.tags || []).some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date': {
          const aDate = ensureDate(a.date)
          const bDate = ensureDate(b.date)
          comparison = (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0)
          break
        }
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'source':
          comparison = a.source.localeCompare(b.source)
          break
        case 'content':
          comparison = ensureString(a.content).localeCompare(ensureString(b.content))
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

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const filteredIds = sortedEntries.map((entry) => entry.id)
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => next.has(id))
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected entries?`)) return

    try {
      await db.transaction('rw', db.entries, async () => {
        for (const id of selectedIds) {
          await db.entries.delete(id)
        }
      })
      setSelectedIds(new Set())
      await loadAllData()
    } catch (error) {
      console.error('Failed to delete selected entries:', error)
    }
  }

  const handleBulkDateUpdate = async () => {
    if (selectedIds.size === 0 || !bulkDate) return
    const nextDate = new Date(bulkDate)
    if (Number.isNaN(nextDate.getTime())) return

    try {
      await db.transaction('rw', db.entries, async () => {
        for (const id of selectedIds) {
          await db.entries.update(id, {
            date: nextDate,
            updatedAt: new Date(),
          })
        }
      })
      setBulkDate('')
      await loadAllData()
    } catch (error) {
      console.error('Failed to update dates:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return

    try {
      // Simple! Just delete from unified table
      await db.entries.delete(id)
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

  const openEdit = (entry: Entry) => {
    setEditingEntry(entry)
    setEditedTags((entry.tags || []).join(', '))
  }

  const closeEdit = () => {
    setEditingEntry(null)
    setEditedTags('')
  }

  const handleEditSave = async () => {
    if (!editingEntry) return

    const normalizedTags = editedTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    try {
      const nextContent = ensureString(editingEntry.content).trim()
      await db.entries.update(editingEntry.id, {
        title: editingEntry.title?.trim() || undefined,
        content: nextContent,
        date: ensureDate(editingEntry.date) ?? new Date(),
        tags: normalizedTags,
        updatedAt: new Date(),
      })
      await loadAllData()
      closeEdit()
    } catch (error) {
      console.error('Failed to update:', error)
    }
  }

  const startInlineEdit = (entry: Entry) => {
    setInlineEditingId(entry.id)
    setInlineEditDraft({
      title: entry.title || '',
      content: ensureString(entry.content),
      date: formatDateTimeLocal(ensureDate(entry.date)),
    })
  }

  const cancelInlineEdit = () => {
    setInlineEditingId(null)
    setInlineEditDraft({ title: '', content: '', date: '' })
  }

  const handleInlineSave = async (entryId: string) => {
    const nextDate = inlineEditDraft.date ? new Date(inlineEditDraft.date) : new Date()
    try {
      await db.entries.update(entryId, {
        title: inlineEditDraft.title.trim() || undefined,
        content: inlineEditDraft.content.trim(),
        date: nextDate,
        updatedAt: new Date(),
      })
      cancelInlineEdit()
      await loadAllData()
    } catch (error) {
      console.error('Failed to update entry:', error)
    }
  }

  const formatDateTimeLocal = (date: Date | null) => {
    if (!date) return ''
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60 * 1000)
    return local.toISOString().slice(0, 16)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voice':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'todo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'reminder':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'note':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'journal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'diary':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'voice':
        return '🎤 Voice'
      case 'ai-chat':
        return '🤖 AI'
      case 'manual':
        return '✍️ Manual'
      case 'diary':
        return '📔 Diary'
      default:
        return source
    }
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">All Entries</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          All your data in one place - {sortedEntries.length} total entries
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Search content or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base min-h-[44px]"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
          >
            Delete selected
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground">Set date/time</label>
            <input
              type="datetime-local"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="px-2 py-1.5 text-sm border border-border rounded bg-background"
            />
            <button
              onClick={handleBulkDateUpdate}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Update dates
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="ml-auto px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={sortedEntries.length > 0 && sortedEntries.every((entry) => selectedIds.has(entry.id))}
                  onChange={toggleSelectAll}
                  aria-label="Select all filtered entries"
                />
              </th>
              <th className="text-left p-3 font-medium whitespace-nowrap">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Date
                  {sortField === 'date' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium w-full">
                <button
                  onClick={() => handleSort('content')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Content
                  {sortField === 'content' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium whitespace-nowrap">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Type
                  {sortField === 'type' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-left p-3 font-medium whitespace-nowrap">Tags</th>
              <th className="text-left p-3 font-medium whitespace-nowrap">
                <button
                  onClick={() => handleSort('source')}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  Source
                  {sortField === 'source' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th className="text-right p-3 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No entries match your search' : 'No entries yet. Start recording or add notes!'}
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 align-top">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelectOne(entry.id)}
                      aria-label={`Select entry ${entry.id}`}
                    />
                  </td>
                  {/* Date */}
                  <td className="p-3 text-sm whitespace-nowrap align-top">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        {inlineEditingId === entry.id ? (
                          <input
                            type="datetime-local"
                            value={inlineEditDraft.date}
                            onChange={(e) =>
                              setInlineEditDraft((prev) => ({ ...prev, date: e.target.value }))
                            }
                            className="px-2 py-1 text-xs border border-border rounded bg-background"
                          />
                        ) : (
                          (() => {
                            const entryDate = ensureDate(entry.date)
                            return entryDate ? (
                              <>
                                <div>{entryDate.toLocaleDateString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground">No date</div>
                            )
                          })()
                        )}
                      </div>
                    </div>
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
                      <div className="flex-1 min-w-0">
                        {inlineEditingId === entry.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={inlineEditDraft.title}
                              onChange={(e) =>
                                setInlineEditDraft((prev) => ({ ...prev, title: e.target.value }))
                              }
                              placeholder="Title (optional)"
                              className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                            />
                            <textarea
                              value={inlineEditDraft.content}
                              onChange={(e) =>
                                setInlineEditDraft((prev) => ({ ...prev, content: e.target.value }))
                              }
                              className="w-full px-2 py-1 text-sm border border-border rounded bg-background resize-none"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            {entry.title && (
                              <div className="font-medium text-sm mb-1">{entry.title}</div>
                            )}
                            <p
                              className={cn(
                                'text-sm line-clamp-2',
                                entry.completed && 'line-through text-muted-foreground'
                              )}
                              onDoubleClick={() => startInlineEdit(entry)}
                            >
                              {ensureString(entry.content)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="p-3 whitespace-nowrap align-top">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getTypeColor(entry.type))}>
                      {entry.type}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="p-3 align-top">
                    {(entry.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(entry.tags || []).map((tag, i) => (
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

                  {/* Source */}
                  <td className="p-3 whitespace-nowrap align-top">
                    <span className="text-sm text-muted-foreground">
                      {getSourceBadge(entry.source)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right whitespace-nowrap align-top">
                    {inlineEditingId === entry.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInlineSave(entry.id)}
                          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelInlineEdit}
                          className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startInlineEdit(entry)}
                          className="p-2 hover:bg-muted/70 text-muted-foreground hover:text-foreground rounded transition-colors"
                          title="Inline edit"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-2 hover:bg-muted/70 text-muted-foreground hover:text-foreground rounded transition-colors"
                          title="Edit details"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Shown on mobile only */}
      <div className="lg:hidden space-y-2 sm:space-y-3">
        {sortedEntries.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-sm sm:text-base text-muted-foreground border border-border rounded-lg">
            {searchQuery ? 'No entries match your search' : 'No entries yet. Start recording or add notes!'}
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'border border-border rounded-lg overflow-hidden bg-card',
                selectedIds.has(entry.id) && 'ring-2 ring-primary'
              )}
            >
              {/* Card Header */}
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 pb-2 sm:pb-3 border-b border-border bg-muted/30">
                <input
                  type="checkbox"
                  checked={selectedIds.has(entry.id)}
                  onChange={() => toggleSelectOne(entry.id)}
                  className="mt-1 flex-shrink-0 min-h-[20px] min-w-[20px]"
                  aria-label={`Select entry ${entry.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                    <span className={cn('px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium', getTypeColor(entry.type))}>
                      {entry.type}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {getSourceBadge(entry.source)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                    <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                    {(() => {
                      const entryDate = ensureDate(entry.date)
                      return entryDate ? (
                        <span className="truncate">
                          {entryDate.toLocaleDateString()} {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span>No date</span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-2 mb-2 sm:mb-3">
                  {(entry.type === 'todo' || entry.type === 'reminder') && (
                    <button
                      onClick={() => handleToggleComplete(entry.id, entry.completed || false)}
                      className="mt-0.5 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-start justify-center"
                    >
                      {entry.completed ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    {entry.title && (
                      <div className="font-medium text-sm sm:text-base mb-1">{entry.title}</div>
                    )}
                    <p className={cn('text-xs sm:text-sm leading-relaxed', entry.completed && 'line-through text-muted-foreground')}>
                      {ensureString(entry.content)}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {(entry.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                    {(entry.tags || []).map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-muted rounded text-[10px] sm:text-xs"
                      >
                        <TagIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-border">
                  <button
                    onClick={() => startInlineEdit(entry)}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors min-h-[40px] sm:min-h-[44px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-2 text-xs sm:text-sm bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors min-h-[40px] sm:min-h-[44px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {sortedEntries.length} of {entries.length} entries
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-background shadow-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-lg font-semibold">Edit Entry</h3>
              <button
                onClick={closeEdit}
                className="p-2 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                aria-label="Close edit dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editingEntry.title || ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Content</label>
                <textarea
                  value={ensureString(editingEntry.content)}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeLocal(ensureDate(editingEntry.date))}
                  onChange={(e) => {
                    const nextDate = e.target.value ? new Date(e.target.value) : new Date()
                    setEditingEntry((prev) => (prev ? { ...prev, date: nextDate } : prev))
                  }}
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  placeholder="work, important"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                onClick={closeEdit}
                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
