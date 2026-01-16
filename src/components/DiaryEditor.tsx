import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useRef } from 'react'
import { Bold, Italic, List, ListOrdered, ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, isSameDay, cn } from '../lib/utils'
import type { DiaryEntry } from '../types'

export function DiaryEditor() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  // Get diary entry for selected date
  const diaryEntry = useLiveQuery(async () => {
    const entries = await db.diaryEntries.toArray()
    return entries.find((entry) => isSameDay(entry.date, selectedDate))
  }, [selectedDate])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your thoughts for today...',
      }),
    ],
    content: diaryEntry?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-96 p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save after 1 second of no typing
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = window.setTimeout(() => {
        handleSave(editor.getHTML())
      }, 1000)
    },
  })

  useEffect(() => {
    if (editor && diaryEntry) {
      editor.commands.setContent(diaryEntry.content)
    } else if (editor) {
      editor.commands.setContent('')
    }
  }, [diaryEntry, editor, selectedDate])

  const handleSave = async (content: string) => {
    if (!content || content === '<p></p>') return

    setIsSaving(true)
    try {
      if (diaryEntry) {
        await db.diaryEntries.update(diaryEntry.id, {
          content,
          updatedAt: new Date(),
        })
      } else {
        const newEntry: DiaryEntry = {
          id: crypto.randomUUID(),
          date: selectedDate,
          content,
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

  if (!editor) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Daily Diary</h2>
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

      {/* Editor Toolbar */}
      <div className="border border-border rounded-t-lg bg-card p-2 flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors',
            editor.isActive('bold') && 'bg-accent'
          )}
          aria-label="Bold"
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors',
            editor.isActive('italic') && 'bg-accent'
          )}
          aria-label="Italic"
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors',
            editor.isActive('bulletList') && 'bg-accent'
          )}
          aria-label="Bullet List"
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors',
            editor.isActive('orderedList') && 'bg-accent'
          )}
          aria-label="Numbered List"
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </button>

        <div className="border-l border-border mx-2" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors text-sm font-bold',
            editor.isActive('heading', { level: 1 }) && 'bg-accent'
          )}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            'p-2 rounded hover:bg-accent transition-colors text-sm font-bold',
            editor.isActive('heading', { level: 2 }) && 'bg-accent'
          )}
          title="Heading 2"
        >
          H2
        </button>
      </div>

      {/* Editor Content */}
      <div className="border border-t-0 border-border rounded-b-lg bg-card">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
