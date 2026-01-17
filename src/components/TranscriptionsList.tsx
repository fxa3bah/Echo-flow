import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, Trash2, Tag, Plus, CheckSquare, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db } from '../lib/db'
import { formatDateTime, cn } from '../lib/utils'
import type { Transcription, EntryCategory } from '../types'

const categoryColors: Record<EntryCategory, string> = {
  journal: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  todo: 'bg-green-500/10 text-green-700 dark:text-green-400',
  reminder: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  note: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
}

const categoryOptions: EntryCategory[] = ['journal', 'todo', 'reminder', 'note']

const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

export function TranscriptionsList() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState<EntryCategory>('note')
  const [editTags, setEditTags] = useState('')
  const [editDate, setEditDate] = useState('')

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EntryCategory | 'all'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<EntryCategory>('note')
  const [newTags, setNewTags] = useState('')
  const [newDate, setNewDate] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<EntryCategory | 'keep'>('keep')
  const [bulkTags, setBulkTags] = useState('')

  const transcriptions = useLiveQuery(
    () => db.transcriptions.orderBy('createdAt').reverse().toArray(),
    []
  )

  const filteredTranscriptions = useMemo(() => {
    if (!transcriptions) return []

    const searchLower = search.trim().toLowerCase()
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    return transcriptions.filter((transcription) => {
      const matchesSearch = !searchLower ||
        transcription.text.toLowerCase().includes(searchLower) ||
        transcription.tags?.some((tag) => tag.toLowerCase().includes(searchLower))

      const matchesCategory = categoryFilter === 'all' || transcription.category === categoryFilter

      const createdAt = new Date(transcription.createdAt)
      const matchesStart = !start || createdAt >= start
      const matchesEnd = !end || createdAt <= end

      return matchesSearch && matchesCategory && matchesStart && matchesEnd
    })
  }, [transcriptions, search, categoryFilter, startDate, endDate])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transcription?')) {
      await db.transcriptions.delete(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleEdit = (transcription: Transcription) => {
    setEditingId(transcription.id)
    setEditText(transcription.text)
    setEditCategory(transcription.category || 'note')
    setEditTags((transcription.tags || []).join(', '))
    setEditDate(new Date(transcription.createdAt).toISOString().slice(0, 16))
  }

  const handleSaveEdit = async (id: string) => {
    const updatedAt = editDate ? new Date(editDate) : new Date()
    await db.transcriptions.update(id, {
      text: editText,
      category: editCategory,
      tags: parseTags(editTags),
      createdAt: updatedAt,
      updatedAt: new Date(),
    })
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
    setEditTags('')
    setEditDate('')
  }

  const handleAddTranscription = async () => {
    if (!newText.trim()) return
    const createdAt = newDate ? new Date(newDate) : new Date()
    await db.transcriptions.add({
      id: crypto.randomUUID(),
      text: newText.trim(),
      createdAt,
      updatedAt: new Date(),
      category: newCategory,
      tags: parseTags(newTags),
      processed: true,
    })
    setNewText('')
    setNewTags('')
    setNewDate('')
  }

  const toggleSelect = (id: string) => {
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTranscriptions.length) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(filteredTranscriptions.map((item) => item.id)))
  }

  const handleBulkUpdate = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const tagsToAdd = parseTags(bulkTags)

    await Promise.all(ids.map(async (id) => {
      const item = await db.transcriptions.get(id)
      if (!item) return

      const updatedTags = tagsToAdd.length > 0
        ? Array.from(new Set([...(item.tags || []), ...tagsToAdd]))
        : item.tags

      await db.transcriptions.update(id, {
        category: bulkCategory === 'keep' ? item.category : bulkCategory,
        tags: updatedTags,
        updatedAt: new Date(),
      })
    }))

    setBulkTags('')
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected transcriptions?`)) return

    await db.transcriptions.bulkDelete(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Transcriptions</h2>
        <p className="text-sm text-muted-foreground">
          Manage, edit, and organize your captured transcriptions.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text or tags"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EntryCategory | 'all')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Add New Transcription
        </h3>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Type a transcription..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as EntryCategory)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleAddTranscription}
          disabled={!newText.trim()}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Plus size={16} />
          Add Transcription
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Bulk Actions
          </h3>
          <div className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value as EntryCategory | 'keep')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="keep">Keep category</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            value={bulkTags}
            onChange={(e) => setBulkTags(e.target.value)}
            placeholder="Add tags (comma separated)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleBulkUpdate}
            disabled={selectedIds.size === 0}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <CheckSquare size={16} />
            Apply
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm',
              'bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                  >
                    {selectedIds.size === filteredTranscriptions.length && filteredTranscriptions.length > 0 ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                    Select
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Text</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTranscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No transcriptions match the current filters.
                  </td>
                </tr>
              )}
              {filteredTranscriptions.map((transcription) => (
                <tr key={transcription.id} className="border-t border-border">
                  <td className="px-4 py-3 align-top">
                    <button
                      onClick={() => toggleSelect(transcription.id)}
                      className="text-muted-foreground"
                    >
                      {selectedIds.has(transcription.id) ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground whitespace-nowrap">
                    {formatDateTime(transcription.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {editingId === transcription.id ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as EntryCategory)}
                        className="w-full px-2 py-1 border border-border rounded bg-background text-xs"
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      transcription.category && (
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            categoryColors[transcription.category]
                          )}
                        >
                          {transcription.category}
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 align-top w-full">
                    {editingId === transcription.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={3}
                        />
                        <input
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded bg-background text-xs"
                        />
                        <input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="Tags (comma separated)"
                          className="w-full px-2 py-1 border border-border rounded bg-background text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(transcription.id)}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs"
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
                  </td>
                  <td className="px-4 py-3 align-top">
                    {editingId === transcription.id ? null : (
                      transcription.tags && transcription.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
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
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
