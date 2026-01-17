import { db } from '../lib/db'
import { startOfDay, endOfDay } from '../lib/utils'
import type { Priority, EntryType } from '../types'

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

  // Find existing diary entry for this date
  const existing = await db.entries
    .where('date')
    .between(startOfDay(date), endOfDay(date), true, true)
    .filter((entry) => entry.type === 'diary' && entry.source === 'diary')
    .first()

  if (existing) {
    if (!shouldAppendContent(existing.content, trimmed)) {
      return false
    }

    await db.entries.update(existing.id, {
      content: `${existing.content.trim()}\n\n${trimmed}`,
      updatedAt: new Date(),
    })
    return true
  }

  // Create new diary entry
  await db.entries.add({
    id: crypto.randomUUID(),
    type: 'diary',
    source: 'diary',
    content: trimmed,
    title: `Daily Notes - ${date.toLocaleDateString()}`,
    date,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    completed: false,
    processed: true,
  })
  return true
}

const findExistingEntry = async (date: Date, type: EntryType, title: string, content: string) => {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const normalizedTitle = title.trim().toLowerCase()
  const normalizedContent = content.trim().toLowerCase()

  return db.entries
    .where('date')
    .between(start, end, true, true)
    .filter((entry) =>
      entry.type === type &&
      ((entry.title && entry.title.trim().toLowerCase() === normalizedTitle) ||
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
      const entryType = action.type as EntryType
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
          source: 'ai-chat',
          title: normalizedTitle,
          content: normalizedContent,
          date: actionDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: normalizedTags,
          priority,
          completed: false,
          processed: true,
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

  // Simple! Just query unified table
  const entries = await db.entries
    .where('date')
    .between(start, end, true, true)
    .toArray()

  if (entries.length === 0) {
    return 'Today\'s context: No entries yet'
  }

  const entryLines = entries.map((entry) => {
    const title = entry.title || entry.content.slice(0, 50)
    return `- [${entry.type}] ${title}: ${entry.content.slice(0, 100)}`
  })

  return [
    'Today\'s context:',
    entryLines.join('\n'),
  ].join('\n')
}
