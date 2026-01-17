import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, isSameDay, cn } from '../lib/utils'
import type { DiaryEntry } from '../types'

export function DiaryEditor() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get diary entry for selected date
  const diaryEntry = useLiveQuery(async () => {
    const entries = await db.diaryEntries.toArray()
    return entries.find((entry) => isSameDay(entry.date, selectedDate))
  }, [selectedDate])

  // Get transcriptions for selected date
  const dayTranscriptions = useLiveQuery(async () => {
    const all = await db.transcriptions.toArray()
    return all.filter((t) => isSameDay(t.createdAt, selectedDate))
  }, [selectedDate])

  // Get entries (todos/reminders) for selected date
  const dayEntries = useLiveQuery(async () => {
    const all = await db.entries.toArray()
    return all.filter((e) => isSameDay(e.date, selectedDate))
  }, [selectedDate])

  useEffect(() => {
    if (diaryEntry) {
      setContent(diaryEntry.content)
    } else {
      setContent('')
    }
  }, [diaryEntry])

  const handleSave = useCallback(async (newContent: string) => {
    if (!newContent || newContent.trim() === '') {
      // If content is empty and entry exists, delete it
      if (diaryEntry) {
        await db.diaryEntries.delete(diaryEntry.id)
      }
      return
    }

    setIsSaving(true)
    try {
      if (diaryEntry) {
        await db.diaryEntries.update(diaryEntry.id, {
          content: newContent,
          updatedAt: new Date(),
        })
      } else {
        const newEntry: DiaryEntry = {
          id: crypto.randomUUID(),
          date: selectedDate,
          content: newContent,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await db.diaryEntries.add(newEntry)
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
    setContent(newContent)

    // Auto-save after 1 second of no typing
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave(newContent)
    }, 1000)
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Daily Notes</h2>
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

      {/* Date Display */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold">{formatDate(selectedDate)}</h3>
      </div>

      {/* Transcriptions Section */}
      {dayTranscriptions && dayTranscriptions.length > 0 && (
        <div className="mb-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Voice Recordings
          </h4>
          {dayTranscriptions.map((transcription) => (
            <div
              key={transcription.id}
              className="p-3 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r"
            >
              <p className="text-sm text-foreground">{transcription.text}</p>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 bg-background rounded">
                  {transcription.category}
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

      {/* Tasks & Reminders Section */}
      {dayEntries && dayEntries.length > 0 && (
        <div className="mb-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tasks & Reminders
          </h4>
          {dayEntries.map((entry) => (
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
                {entry.completed ? (
                  <CheckSquare className="w-5 h-5 text-green-600" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm',
                    entry.completed && 'line-through text-muted-foreground'
                  )}
                >
                  {entry.content}
                </p>
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

      {/* Notes Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Daily Notes
        </h4>
        <div className="border border-border rounded-lg bg-card">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Write your thoughts for today...

Use markdown:
- **bold**, *italic*, ~~strikethrough~~
- # Heading 1, ## Heading 2
- - Bullet points
- [ ] Todo items (type [ ] or [x])
- tomorrow, next week (auto-detected)"
            className="w-full p-4 bg-transparent border-none focus:outline-none resize-none min-h-[300px] font-mono text-sm"
            style={{ overflow: 'hidden' }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Markdown supported. Type naturally and dates, todos, and reminders will be auto-detected.
        </p>
      </div>
    </div>
  )
}
