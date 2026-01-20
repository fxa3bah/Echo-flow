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
  const actionSummariesByDate = new Map<string, { date: Date; lines: string[] }>()

  const addActionSummary = (date: Date, action: AIAction) => {
    const key = date.toDateString()
    const existing = actionSummariesByDate.get(key) ?? { date, lines: [] }
    const dueText = action.date ? ` (due ${action.date.toLocaleString()})` : ''
    existing.lines.push(`[${action.type}] ${action.title}${dueText}`)
    actionSummariesByDate.set(key, existing)
  }

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
        addActionSummary(actionDate, { ...action, title: normalizedTitle })
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
        addActionSummary(actionDate, { ...action, title: normalizedTitle })
      }
    }

    if (action.type === 'journal' || action.type === 'note') {
      const appended = await appendToDiaryEntry(actionDate, normalizedContent)
      diaryUpdated = diaryUpdated || appended
    }
  }

  for (const { date, lines } of actionSummariesByDate.values()) {
    if (lines.length > 0) {
      const summary = lines.map((line) => `- ${line}`).join('\n')
      const appended = await appendToDiaryEntry(date, summary)
      diaryUpdated = diaryUpdated || appended
    }
  }

  return { created, updated, diaryUpdated }
}

export async function buildAIContextSummary(date = new Date()): Promise<string> {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const now = new Date()

  // Get all incomplete todos and reminders for focus context
  const allIncompleteItems = await db.entries
    .filter((entry) => (entry.type === 'todo' || entry.type === 'reminder') && !entry.completed)
    .toArray()

  // Categorize by time horizon (matching Focus View logic)
  const doNowItems = allIncompleteItems.filter((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
    const hoursDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursDiff >= -24 && hoursDiff <= 24
  })

  const thisWeekItems = allIncompleteItems.filter((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
    const daysDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff > 1 && daysDiff <= 7
  })

  const laterItems = allIncompleteItems.filter((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
    if (!entryDate) return true
    const daysDiff = (entryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff > 7
  })

  // Get today's entries for additional context
  const todayEntries = await db.entries
    .where('date')
    .between(start, end, true, true)
    .toArray()

  const diaryEntries = todayEntries.filter(e => e.type === 'diary')
  const sections: string[] = []

  // PRIORITY: Show Do Now items first (most important for AI to know)
  if (doNowItems.length > 0) {
    sections.push('🔥 DO NOW (Next 24 hours) - URGENT:')
    doNowItems.forEach((entry) => {
      const title = entry.title || entry.content.slice(0, 50)
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
      const timeStr = entryDate.toLocaleString()
      sections.push(`  • [${entry.type}] ${title} (due: ${timeStr})`)
    })
    sections.push('')
  }

  // Show This Week items
  if (thisWeekItems.length > 0) {
    sections.push('📅 THIS WEEK (Next 7 days):')
    thisWeekItems.forEach((entry) => {
      const title = entry.title || entry.content.slice(0, 50)
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
      sections.push(`  • [${entry.type}] ${title} (due: ${entryDate.toLocaleDateString()})`)
    })
    sections.push('')
  }

  // Show Later items (backlog)
  if (laterItems.length > 0) {
    sections.push('🌙 LATER (Backlog):')
    laterItems.forEach((entry) => {
      const title = entry.title || entry.content.slice(0, 50)
      sections.push(`  • [${entry.type}] ${title}`)
    })
    sections.push('')
  }

  // If no tasks at all
  if (allIncompleteItems.length === 0) {
    sections.push('✅ No pending tasks or reminders!')
    sections.push('')
  }

  // Show today's diary entries for context
  if (diaryEntries.length > 0) {
    sections.push('📔 Today\'s Notes:')
    diaryEntries.forEach((entry) => {
      sections.push(`${entry.content.slice(0, 200)}${entry.content.length > 200 ? '...' : ''}`)
    })
  }

  return sections.join('\n')
}
