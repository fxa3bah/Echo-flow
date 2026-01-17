import { db } from '../lib/db'
import { startOfDay, endOfDay } from '../lib/utils'
import type { Priority, EntryCategory } from '../types'

export interface AIAction {
  type: 'todo' | 'reminder' | 'note' | 'journal'
  title: string
  content: string
  date?: Date
  priority?: string
  tags?: string[]
}

interface ApplyActionsResult {
  created: number
  updated: number
  diaryUpdated: boolean
}

const validPriorities: Priority[] = [
  'urgent-important',
  'not-urgent-important',
  'urgent-not-important',
  'not-urgent-not-important',
]

const normalizeTags = (tags?: string[]) =>
  (tags || []).map((tag) => tag.trim()).filter(Boolean)

const normalizeContent = (content: string) => content.trim()

const shouldAppendContent = (existingContent: string, newContent: string) =>
  !existingContent.toLowerCase().includes(newContent.toLowerCase())

export async function appendToDiaryEntry(date: Date, text: string): Promise<boolean> {
  const trimmed = normalizeContent(text)
  if (!trimmed) return false

  const existing = await db.diaryEntries
    .where('date')
    .between(startOfDay(date), endOfDay(date), true, true)
    .first()

  if (existing) {
    if (!shouldAppendContent(existing.content, trimmed)) {
      return false
    }

    await db.diaryEntries.update(existing.id, {
      content: `${existing.content.trim()}\n\n${trimmed}`,
      updatedAt: new Date(),
    })
    return true
  }

  await db.diaryEntries.add({
    id: crypto.randomUUID(),
    date,
    content: trimmed,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return true
}

const findExistingEntry = async (date: Date, type: EntryCategory, title: string, content: string) => {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const normalizedTitle = title.trim().toLowerCase()
  const normalizedContent = content.trim().toLowerCase()

  return db.entries
    .where('date')
    .between(start, end, true, true)
    .filter((entry) =>
      entry.type === type &&
      (entry.title.trim().toLowerCase() === normalizedTitle ||
        entry.content.trim().toLowerCase() === normalizedContent)
    )
    .first()
}

export async function applyAIActions(actions: AIAction[], fallbackDate = new Date()): Promise<ApplyActionsResult> {
  let created = 0
  let updated = 0
  let diaryUpdated = false

  for (const action of actions) {
    const actionDate = action.date || fallbackDate
    const normalizedTags = normalizeTags(action.tags)
    const normalizedContent = normalizeContent(action.content)
    const normalizedTitle = action.title?.trim() || normalizedContent.slice(0, 50)

    if (action.type === 'todo' || action.type === 'reminder') {
      const entryType = action.type as EntryCategory
      const existing = await findExistingEntry(actionDate, entryType, normalizedTitle, normalizedContent)

      if (existing) {
        const mergedTags = Array.from(new Set([...(existing.tags || []), ...normalizedTags]))
        const priority = validPriorities.includes(action.priority as Priority)
          ? action.priority as Priority
          : existing.priority

        await db.entries.update(existing.id, {
          title: normalizedTitle,
          content: normalizedContent,
          tags: mergedTags,
          priority,
          updatedAt: new Date(),
        })
        updated += 1
      } else {
        const priority = validPriorities.includes(action.priority as Priority)
          ? action.priority as Priority
          : undefined

        await db.entries.add({
          id: crypto.randomUUID(),
          type: entryType,
          title: normalizedTitle,
          content: normalizedContent,
          date: actionDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: normalizedTags,
          priority,
          completed: false,
          linkedEntryIds: [],
        })
        created += 1
      }
    }

    if (action.type === 'journal' || action.type === 'note') {
      const diaryText = `### ${normalizedTitle}\n${normalizedContent}`
      const appended = await appendToDiaryEntry(actionDate, diaryText)
      diaryUpdated = diaryUpdated || appended
    }
  }

  return { created, updated, diaryUpdated }
}

export async function buildAIContextSummary(date = new Date()): Promise<string> {
  const start = startOfDay(date)
  const end = endOfDay(date)

  const [entries, transcriptions, diaryEntry] = await Promise.all([
    db.entries.where('date').between(start, end, true, true).toArray(),
    db.transcriptions.where('createdAt').between(start, end, true, true).toArray(),
    db.diaryEntries.where('date').between(start, end, true, true).first(),
  ])

  const entryLines = entries.map((entry) =>
    `- [${entry.type}] ${entry.title}: ${entry.content}`
  )
  const transcriptionLines = transcriptions.map((item) =>
    `- [transcription] ${item.text}`
  )

  return [
    'Today\'s context:',
    entryLines.length ? 'Entries:\n' + entryLines.join('\n') : 'Entries: none',
    transcriptionLines.length ? 'Transcriptions:\n' + transcriptionLines.join('\n') : 'Transcriptions: none',
    diaryEntry?.content ? `Daily Notes:\n${diaryEntry.content}` : 'Daily Notes: none',
  ].join('\n')
}
