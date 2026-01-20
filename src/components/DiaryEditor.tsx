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
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-5xl h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-2 mb-2 sm:mb-4 pb-2 sm:pb-3 border-b border-border flex-shrink-0 flex-wrap">
        <div className="space-y-0.5 flex-1 min-w-0">
          <h2 className="text-base sm:text-2xl font-bold leading-tight">{formatDate(selectedDate)}</h2>
          <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight">
            {isSaving
              ? 'Saving...'
              : lastSaved
              ? `Last saved ${lastSaved.toLocaleTimeString()}`
              : 'Auto-saved'}
          </p>
        </div>

        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={goToToday}
            className="px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors min-h-[32px] sm:min-h-[40px]"
          >
            Today
          </button>
          <button
            onClick={goToPreviousDay}
            className="p-1 sm:p-2 hover:bg-accent rounded-lg transition-colors min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center"
            aria-label="Previous day"
          >
            <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={goToNextDay}
            className="p-1 sm:p-2 hover:bg-accent rounded-lg transition-colors min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center"
            aria-label="Next day"
          >
            <ChevronRight size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-4">
        {/* Transcriptions Section */}
        {dayTranscriptions && dayTranscriptions.length > 0 && (
          <div>
            <button
              onClick={() => setTranscriptionsExpanded(!transcriptionsExpanded)}
              className="w-full flex items-center justify-between mb-1.5 sm:mb-2 p-1.5 sm:p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <h4 className="text-[11px] sm:text-sm font-semibold text-foreground">
              Captured Notes ({dayTranscriptions.length})
            </h4>
            {transcriptionsExpanded ? <ChevronUp size={14} className="sm:w-[18px] sm:h-[18px]" /> : <ChevronDown size={14} className="sm:w-[18px] sm:h-[18px]" />}
          </button>
          {transcriptionsExpanded && (
            <div className="space-y-1.5 sm:space-y-2.5">
              {dayTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="p-2 sm:p-3.5 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg shadow-sm"
                >
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed">{transcription.content}</p>
                  <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2.5 text-[10px] sm:text-xs text-muted-foreground">
                    <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-background rounded-md font-medium">
                      {transcription.type}
                    </span>
                    {transcription.tags?.map((tag) => (
                      <span key={tag} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-background rounded-md">
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
          <div>
            <button
              onClick={() => setTasksExpanded(!tasksExpanded)}
              className="w-full flex items-center justify-between mb-1.5 sm:mb-2 p-1.5 sm:p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <h4 className="text-[11px] sm:text-sm font-semibold text-foreground">
                Tasks ({dayEntries.filter((e) => !e.completed).length} active)
              </h4>
              {tasksExpanded ? <ChevronUp size={14} className="sm:w-4 sm:h-4" /> : <ChevronDown size={14} className="sm:w-4 sm:h-4" />}
            </button>
            {tasksExpanded && (
              <div className="space-y-1.5 sm:space-y-2">
              {/* Show incomplete tasks first */}
              {dayEntries
                .filter((e) => !e.completed)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'p-2 sm:p-3.5 border-l-4 rounded-r-lg flex items-start gap-2 sm:gap-3 shadow-sm',
                      entry.type === 'todo'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                        : 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(entry.id, entry.completed || false)}
                      className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                    >
                      <Square className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-primary" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium leading-relaxed">{ensureString(entry.content)}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2.5 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-background rounded-md">
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
                      'p-2 sm:p-3 border-l-4 rounded-r flex items-start gap-2 sm:gap-3 opacity-60',
                      entry.type === 'todo'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                        : 'bg-purple-50 dark:bg-purple-950/30 border-purple-500'
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(entry.id, entry.completed || false)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm line-through text-muted-foreground">{ensureString(entry.content)}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="px-1.5 sm:px-2 py-0.5 bg-background rounded">
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
        <div className="space-y-1.5 sm:space-y-2 relative flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5 hover:bg-accent rounded-lg transition-colors"
            >
              <h4 className="text-[11px] sm:text-sm font-semibold text-foreground">
                Notes
            </h4>
            {notesExpanded ? <ChevronUp size={14} className="sm:w-[18px] sm:h-[18px]" /> : <ChevronDown size={14} className="sm:w-[18px] sm:h-[18px]" />}
          </button>
          {notesExpanded && (
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors min-h-[32px] sm:min-h-[40px]"
            >
              {isPreviewMode ? (
                <>
                  <Edit3 size={12} className="sm:w-4 sm:h-4" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <Eye size={12} className="sm:w-4 sm:h-4" />
                  <span>Preview</span>
                </>
              )}
            </button>
          )}
        </div>
        {notesExpanded && (
          <>
            <div className="border border-border rounded-lg sm:rounded-xl bg-card relative shadow-sm flex-1">
              {isPreviewMode ? (
                <div
                  className="w-full p-2.5 sm:p-5 min-h-[50vh] sm:min-h-[30vh] lg:min-h-[240px] prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Start typing... (Markdown supported)"
                    className="w-full p-2.5 sm:p-5 bg-transparent border-none focus:outline-none resize-none min-h-[50vh] sm:min-h-[30vh] lg:min-h-[240px] font-sans text-xs sm:text-sm leading-relaxed"
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
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
              {isPreviewMode
                ? 'Click Edit to modify.'
                : 'Type / for commands. Auto-detects dates, todos, reminders.'}
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
