import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckSquare, Square, Eye, Edit3, ChevronDown, ChevronUp } from 'lucide-react'
import { marked } from 'marked'
import { db } from '../lib/db'
import { formatDate, isSameDay, cn, ensureDate, ensureString } from '../lib/utils'
import type { Entry } from '../types'
import { SlashCommandMenu, type SlashCommand } from './SlashCommandMenu'

// Helper function to strip HTML tags and convert to plain text
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export function DiaryEditor() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(true)
  const [renderedHtml, setRenderedHtml] = useState('')
  const saveTimeoutRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Collapsible section states
  const [transcriptionsExpanded, setTranscriptionsExpanded] = useState(true)
  const [tasksExpanded, setTasksExpanded] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState(true)

  // Slash command menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
  const [slashStartPos, setSlashStartPos] = useState(0)

  // Get all entries for selected date from UNIFIED table
  const allDayData = useLiveQuery(async () => {
    const all = await db.entries.toArray()
    return all.filter((e) => {
      const entryDate = ensureDate(e.date)
      return entryDate ? isSameDay(entryDate, selectedDate) : false
    })
  }, [selectedDate])

  // Separate by type
  const diaryEntry = allDayData?.find((e) => e.type === 'diary')
  const dayTranscriptions = allDayData?.filter((e) => e.type === 'voice') || []
  const dayEntries = allDayData?.filter((e) => {
    const content = ensureString(e.content)
    return (e.type === 'todo' || e.type === 'reminder') &&
      !content.trim().startsWith('### AI Actions')
  }) || []

  useEffect(() => {
    const cleanupLegacyEntries = async () => {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999)
      await db.entries
        .where('date')
        .between(start, end, true, true)
        .filter((entry) => ensureString(entry.content).trim().startsWith('### AI Actions'))
        .delete()
    }
    cleanupLegacyEntries().catch(console.error)
  }, [selectedDate])

  useEffect(() => {
    if (diaryEntry) {
      // Check if content contains HTML tags (from old rich text editor)
      const safeContent = ensureString(diaryEntry.content)
      const hasHtmlTags = /<[^>]+>/.test(safeContent)
      const rawContent = hasHtmlTags ? stripHtml(safeContent) : safeContent
      const cleanedContent = rawContent
        .split('\n')
        .filter((line) => !line.trim().startsWith('### AI Actions'))
        .join('\n')

      setContent(cleanedContent)

      if (cleanedContent !== safeContent) {
        db.entries.update(diaryEntry.id, {
          content: cleanedContent,
          updatedAt: new Date(),
        }).catch(console.error)
      }
    } else {
      setContent('')
    }
  }, [diaryEntry])

  useEffect(() => {
    if (!diaryEntry?.content) {
      setIsPreviewMode(false)
    }
  }, [diaryEntry?.content])

  // Render markdown when in preview mode
  useEffect(() => {
    if (isPreviewMode) {
      const renderMarkdown = async () => {
        const html = await marked.parse(content || '*No content yet. Click Edit to start writing.*')
        setRenderedHtml(html)
      }
      renderMarkdown()
    }
  }, [isPreviewMode, content])

  const handleSave = useCallback(async (newContent: string) => {
    if (!newContent || newContent.trim() === '') {
      // If content is empty and entry exists, delete it
      if (diaryEntry) {
        await db.entries.delete(diaryEntry.id)
      }
      return
    }

    setIsSaving(true)
    try {
      if (diaryEntry) {
        await db.entries.update(diaryEntry.id, {
          content: newContent,
          updatedAt: new Date(),
        })
      } else {
        const newEntry: Entry = {
          id: crypto.randomUUID(),
          type: 'diary',
          source: 'diary',
          date: selectedDate,
          content: newContent,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          linkedEntryIds: [],
        }
        await db.entries.add(newEntry)
      }
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save diary entry:', error)
    } finally {
      setIsSaving(false)
    }
  }, [diaryEntry, selectedDate])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const cursorPos = e.target.selectionStart
    setContent(newContent)

    // Check for slash command trigger
    const textBeforeCursor = newContent.substring(0, cursorPos)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

    // Check if we just typed a slash at the start of a line or after a space
    if (lastSlashIndex !== -1) {
      const charBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : '\n'
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1)

      // Only show menu if slash is at start of line or after whitespace, and no space after slash yet
      if ((charBeforeSlash === '\n' || charBeforeSlash === ' ') && !textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
        setSlashFilter(textAfterSlash)
        setSlashStartPos(lastSlashIndex)

        // Calculate menu position
        if (textareaRef.current) {
          const textarea = textareaRef.current
          const { top, left } = getCaretCoordinates(textarea, cursorPos)
          setSlashPosition({
            top: top + 20,
            left: left
          })
        }

        setShowSlashMenu(true)
      } else {
        setShowSlashMenu(false)
      }
    } else {
      setShowSlashMenu(false)
    }

    // Auto-save after 1 second of no typing
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave(newContent)
    }, 1000)
  }

  const handleSlashCommandSelect = (command: SlashCommand) => {
    if (!textareaRef.current) return

    // Get the command value (could be a function)
    const commandValue = typeof command.value === 'function' ? command.value() : command.value

    // Replace /filter with the command
    const before = content.substring(0, slashStartPos)
    const after = content.substring(textareaRef.current.selectionStart)
    const newContent = before + commandValue + after

    setContent(newContent)
    setShowSlashMenu(false)

    // Set cursor position after inserted command
    setTimeout(() => {
      if (textareaRef.current) {
        let cursorPos = before.length + commandValue.length

        // For paired characters, move cursor to middle
        if (commandValue === '****' || commandValue === '**' || commandValue === '~~~~' ||
            commandValue === '====' || commandValue === '``' || commandValue === '[[]]' ||
            commandValue === '[]()') {
          cursorPos = before.length + Math.floor(commandValue.length / 2)
        }

        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)

    // Save the new content
    handleSave(newContent)
  }

  // Function to get caret coordinates in textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div')
    const span = document.createElement('span')
    const computed = window.getComputedStyle(element)

    div.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      line-height: ${computed.lineHeight};
      padding: ${computed.padding};
      width: ${element.clientWidth}px;
    `

    div.textContent = element.value.substring(0, position)
    span.textContent = element.value.substring(position) || '.'
    div.appendChild(span)
    document.body.appendChild(div)

    const { offsetTop: top, offsetLeft: left } = span
    document.body.removeChild(div)

    return { top: top + element.offsetTop, left: left + element.offsetLeft }
  }

  const handleToggleTodo = async (entryId: string, currentCompleted: boolean) => {
    await db.entries.update(entryId, { completed: !currentCompleted })
  }

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    setSelectedDate(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    setSelectedDate(next)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{formatDate(selectedDate)}</h2>
          <p className="text-sm text-muted-foreground">
            {isSaving
              ? 'Saving...'
              : lastSaved
              ? `Last saved at ${lastSaved.toLocaleTimeString()}`
              : 'All changes are automatically saved'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPreviousDay}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNextDay}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Transcriptions Section */}
      {dayTranscriptions && dayTranscriptions.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setTranscriptionsExpanded(!transcriptionsExpanded)}
            className="w-full flex items-center justify-between mb-2 p-2 hover:bg-accent rounded transition-colors"
          >
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Captured Notes ({dayTranscriptions.length})
            </h4>
            {transcriptionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {transcriptionsExpanded && (
            <div className="space-y-2">
              {dayTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="p-3 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r"
                >
                  <p className="text-sm text-foreground">{transcription.content}</p>
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 bg-background rounded">
                      {transcription.type}
                    </span>
                    {transcription.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-background rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks & Reminders Section */}
      {dayEntries && dayEntries.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setTasksExpanded(!tasksExpanded)}
            className="w-full flex items-center justify-between mb-2 p-2 hover:bg-accent rounded transition-colors"
          >
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tasks & Reminders ({dayEntries.filter((e) => !e.completed).length} active, {dayEntries.filter((e) => e.completed).length} done)
            </h4>
            {tasksExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {tasksExpanded && (
            <div className="space-y-2">
              {/* Show incomplete tasks first */}
              {dayEntries
                .filter((e) => !e.completed)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'p-3 border-l-4 rounded-r flex items-start gap-3',
                      entry.type === 'todo'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                        : 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(entry.id, entry.completed || false)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <Square className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ensureString(entry.content)}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-background rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {/* Show completed tasks after */}
              {dayEntries
                .filter((e) => e.completed)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'p-3 border-l-4 rounded-r flex items-start gap-3 opacity-60',
                      entry.type === 'todo'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                        : 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(entry.id, entry.completed || false)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <CheckSquare className="w-5 h-5 text-green-600" />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm line-through text-muted-foreground">{ensureString(entry.content)}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-background rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setNotesExpanded(!notesExpanded)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded transition-colors"
          >
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </h4>
            {notesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {notesExpanded && (
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              {isPreviewMode ? (
                <>
                  <Edit3 size={14} />
                  Edit
                </>
              ) : (
                <>
                  <Eye size={14} />
                  Preview
                </>
              )}
            </button>
          )}
        </div>
        {notesExpanded && (
          <>
            <div className="border border-border rounded-lg bg-card relative">
              {isPreviewMode ? (
                <div
                  className="w-full p-4 min-h-[320px] prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Start typing... (Markdown supported)"
                    className="w-full p-4 bg-transparent border-none focus:outline-none resize-none min-h-[320px] font-sans text-sm leading-relaxed"
                    style={{ overflow: 'hidden' }}
                  />

                  {/* Slash Command Menu */}
                  {showSlashMenu && (
                    <SlashCommandMenu
                      filter={slashFilter}
                      onSelect={handleSlashCommandSelect}
                      onClose={() => setShowSlashMenu(false)}
                      position={slashPosition}
                    />
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPreviewMode
                ? 'Viewing formatted text. Click Edit to modify.'
                : 'Markdown is supported. Type / for commands. Dates, todos, and reminders are auto-detected.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
