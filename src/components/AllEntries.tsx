import { useState, useEffect, useMemo } from 'react'
import { Trash2, Calendar as CalendarIcon, CheckSquare, Square, SquarePen, SlidersHorizontal, X, Archive, ArchiveRestore } from 'lucide-react'
import { db } from '../lib/db'
import { cn, ensureDate, ensureString } from '../lib/utils'
import { TagCloud, getTagColor } from './TagCloud'
import type { Entry } from '../types'

type SortField = 'date' | 'type' | 'content' | 'source'
type SortDirection = 'asc' | 'desc'

export function AllEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showArchived, setShowArchived] = useState(false)
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
    let filtered = showArchived
      ? entries
      : entries.filter(e => !e.archived)

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

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(e =>
        selectedTags.every(tag => (e.tags || []).includes(tag))
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

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.size === 0) return
    try {
      await db.transaction('rw', db.entries, async () => {
        for (const id of selectedIds) {
          await db.entries.update(id, { archived: archive })
        }
      })
      setSelectedIds(new Set())
      await loadAllData()
    } catch (error) {
      console.error(`Failed to ${archive ? 'archive' : 'unarchive'} selected entries:`, error)
    }
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

  const handleToggleArchive = async (id: string, currentStatus?: boolean) => {
    try {
      await db.entries.update(id, { archived: !currentStatus })
      await loadAllData()
    } catch (error) {
      console.error('Failed to update archive status:', error)
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
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
      case 'todo':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      case 'reminder':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      case 'note':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
      case 'journal':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
      case 'diary':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
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
    <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-7xl">
      <div className="mb-10 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3 bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
          All Entries
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground font-medium">
          Your complete knowledge base — {sortedEntries.length} items found
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-sm">
            <TagCloud
              selectedTags={selectedTags}
              onTagClick={(tag) => setSelectedTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
              )}
              onClearTags={() => setSelectedTags([])}
            />
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-8">
          {/* Enhanced Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-card/50 backdrop-blur-sm border border-border/50 p-3 rounded-2xl shadow-sm">
            <div className="relative flex-1 group">
              <input
                type="text"
                placeholder="Search anything (content, tags, dates)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background/50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base outline-none group-hover:bg-background transition-colors"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>

            <label className="flex items-center gap-3 px-4 py-2 bg-background/50 border border-border/50 rounded-xl cursor-pointer hover:bg-background hover:border-primary/30 transition-all group">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Archived</span>
            </label>
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
              <button
                onClick={() => handleBulkArchive(true)}
                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Archive selected
              </button>
              <button
                onClick={() => handleBulkArchive(false)}
                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Unarchive selected
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
          <div className="hidden lg:block bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={sortedEntries.length > 0 && sortedEntries.every((entry) => selectedIds.has(entry.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      aria-label="Select all filtered entries"
                    />
                  </th>
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-2 hover:text-primary transition-colors group"
                    >
                      Date
                      <span className={cn("transition-transform group-hover:translate-y-0.5", sortField !== 'date' && "opacity-0")}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    <button
                      onClick={() => handleSort('content')}
                      className="flex items-center gap-2 hover:text-primary transition-colors group"
                    >
                      Content
                      <span className={cn("transition-transform group-hover:translate-y-0.5", sortField !== 'content' && "opacity-0")}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-2 hover:text-primary transition-colors group"
                    >
                      Type
                      <span className={cn("transition-transform group-hover:translate-y-0.5", sortField !== 'type' && "opacity-0")}>
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  </th>
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground">Tags</th>
                  <th className="text-left p-5 font-bold text-xs uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-muted-foreground font-medium">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-muted/50 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                        </div>
                        {searchQuery ? 'No entries match your search' : 'No entries yet. Start recording or add notes!'}
                      </div>
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
                      {/* Date & Source */}
                      <td className="p-5 text-sm whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 group">
                            <div className="p-1.5 bg-muted/50 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
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
                                      <div className="font-bold text-foreground/90">{entryDate.toLocaleDateString()}</div>
                                      <div className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase">
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

                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-lg border border-border/50 text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                              {getSourceBadge(entry.source).split(' ')[0]}
                              {getSourceBadge(entry.source).split(' ')[1]}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Content */}
                      <td className="p-5">
                        <div className="flex items-start gap-4">
                          {(entry.type === 'todo' || entry.type === 'reminder') && (
                            <button
                              onClick={() => handleToggleComplete(entry.id, entry.completed || false)}
                              className="mt-1 flex-shrink-0 transition-transform active:scale-90"
                            >
                              {entry.completed ? (
                                <div className="p-1 bg-emerald-500 rounded-md text-white shadow-md shadow-emerald-500/20">
                                  <CheckSquare className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="p-1 bg-muted rounded-md text-muted-foreground border border-border">
                                  <Square className="w-4 h-4" />
                                </div>
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0 pr-4">
                            {inlineEditingId === entry.id ? (
                              <div className="space-y-3 bg-muted/50 p-4 rounded-2xl">
                                <input
                                  type="text"
                                  value={inlineEditDraft.title}
                                  onChange={(e) =>
                                    setInlineEditDraft((prev) => ({ ...prev, title: e.target.value }))
                                  }
                                  placeholder="Entry Title"
                                  className="w-full px-4 py-2 text-sm font-bold border-none bg-background rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                                <textarea
                                  value={inlineEditDraft.content}
                                  onChange={(e) =>
                                    setInlineEditDraft((prev) => ({ ...prev, content: e.target.value }))
                                  }
                                  className="w-full px-4 py-2 text-sm border-none bg-background rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none min-h-[100px]"
                                  rows={3}
                                />
                              </div>
                            ) : (
                              <div className="py-1">
                                {entry.title && (
                                  <div className="font-black text-lg mb-1.5 text-foreground leading-tight">{entry.title}</div>
                                )}
                                <p
                                  className={cn(
                                    'text-sm leading-relaxed text-muted-foreground/90 font-medium tracking-tight',
                                    entry.completed && 'line-through opacity-50'
                                  )}
                                  onDoubleClick={() => startInlineEdit(entry)}
                                >
                                  <div
                                    dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }}
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                  />
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-5 whitespace-nowrap align-top">
                        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm', getTypeColor(entry.type))}>
                          {entry.type}
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="p-5 align-top min-w-[140px]">
                        {(entry.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(entry.tags || []).map((tag, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] border shadow-sm font-bold uppercase tracking-tight transition-transform hover:scale-105",
                                  getTagColor(tag)
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-5 text-right whitespace-nowrap align-top">
                        {inlineEditingId === entry.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleInlineSave(entry.id)}
                              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleArchive(entry.id, entry.archived)}
                              className={cn(
                                "p-2.5 rounded-xl transition-all active:scale-95",
                                entry.archived
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                              )}
                              title={entry.archived ? "Unarchive" : "Archive"}
                            >
                              {entry.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => startInlineEdit(entry)}
                              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl transition-all active:scale-95"
                              title="Inline edit"
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(entry)}
                              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl transition-all active:scale-95"
                              title="Edit details"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-95"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View - Shown on mobile only */}
          <div className="lg:hidden space-y-4">
            {sortedEntries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl font-medium">
                {searchQuery ? 'No entries match your search' : 'No entries yet.'}
              </div>
            ) : (
              sortedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'group border border-border/30 rounded-[32px] overflow-hidden bg-card/50 backdrop-blur-sm transition-all shadow-sm active:scale-[0.98]',
                    selectedIds.has(entry.id) && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <div className="p-6 space-y-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelectOne(entry.id)}
                          className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary"
                        />
                        <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border border-transparent', getTypeColor(entry.type))}>
                          {entry.type}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {(() => {
                          const entryDate = ensureDate(entry.date)
                          return entryDate ? (
                            <>
                              <span className="text-[10px] font-black tracking-widest text-foreground/80 uppercase">
                                {entryDate.toLocaleDateString()}
                              </span>
                              <span className="text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase">
                                {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase">No date</span>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex items-start gap-4">
                      {(entry.type === 'todo' || entry.type === 'reminder') && (
                        <button
                          onClick={() => handleToggleComplete(entry.id, entry.completed || false)}
                          className="mt-1 flex-shrink-0 transition-transform active:scale-90"
                        >
                          {entry.completed ? (
                            <div className="p-1.5 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                              <CheckSquare className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-muted rounded-xl text-muted-foreground border border-border">
                              <Square className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        {entry.title && (
                          <div className="font-black text-lg mb-1.5 leading-tight text-foreground">{entry.title}</div>
                        )}
                        <div className={cn(
                          'text-sm leading-relaxed font-medium tracking-tight',
                          entry.completed ? 'line-through text-muted-foreground/30' : 'text-muted-foreground/90'
                        )}>
                          <div dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }} className="prose prose-sm dark:prose-invert max-w-none" />
                        </div>
                      </div>
                    </div>

                    {/* Tags Footer */}
                    {(entry.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(entry.tags || []).map((tag, i) => (
                          <span
                            key={i}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border shadow-sm transition-transform active:scale-95",
                              getTagColor(tag)
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta Indicators */}
                    <div className="flex items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-muted/50 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 border border-border/10">
                        {getSourceBadge(entry.source).split(' ')[0]}
                        <span>{getSourceBadge(entry.source).split(' ')[1]}</span>
                      </span>
                      {entry.archived && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-lg">Archived</span>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-6 border-t border-border/20">
                      <button
                        onClick={() => startInlineEdit(entry)}
                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-secondary text-secondary-foreground rounded-2xl active:bg-secondary/70 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-destructive/10 text-destructive rounded-2xl active:bg-destructive/20 transition-all font-bold"
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
          <div className="mt-8 flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-2">
            <div>
              Showing {sortedEntries.length} items
              {searchQuery && <span className="text-primary/40 ml-2">Filtered by "{searchQuery}"</span>}
            </div>
            <div className="hidden sm:block">
              Echo Flow Intelligence v2.0
            </div>
          </div>

          {editingEntry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/60">
              <div className="w-full max-w-xl rounded-[40px] bg-card border border-border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden scale-in-center">
                <div className="flex items-center justify-between border-b border-border/50 px-8 py-6 bg-muted/20">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Edit Entry</h3>
                    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Refine your memory</p>
                  </div>
                  <button
                    onClick={closeEdit}
                    className="p-3 rounded-2xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-90"
                    aria-label="Close edit dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Title</label>
                    <input
                      type="text"
                      value={editingEntry.title || ''}
                      onChange={(e) =>
                        setEditingEntry((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                      }
                      className="w-full px-5 py-3 text-sm font-bold border border-border rounded-2xl bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Content</label>
                    <textarea
                      value={ensureString(editingEntry.content)}
                      onChange={(e) =>
                        setEditingEntry((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                      }
                      className="w-full px-5 py-4 text-sm font-medium border border-border rounded-[24px] bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none min-h-[120px]"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formatDateTimeLocal(ensureDate(editingEntry.date))}
                        onChange={(e) => {
                          const nextDate = e.target.value ? new Date(e.target.value) : new Date()
                          setEditingEntry((prev) => (prev ? { ...prev, date: nextDate } : prev))
                        }}
                        className="w-full px-5 py-3 text-sm font-bold border border-border rounded-2xl bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Tags</label>
                      <input
                        type="text"
                        value={editedTags}
                        onChange={(e) => setEditedTags(e.target.value)}
                        className="w-full px-5 py-3 text-sm font-bold border border-border rounded-2xl bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="work, life, urgent"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-8 py-6 bg-muted/20 border-t border-border/50">
                  <button
                    onClick={closeEdit}
                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="px-8 py-3 text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all"
                  >
                    Push Update
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
