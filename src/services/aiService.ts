import type { AIAnalysisResult, EntryCategory, Priority } from '../types'

const OLLAMA_API_URL = 'http://localhost:11434/api/generate'

interface OllamaResponse {
  response: string
  done: boolean
}

export class AIService {
  private useOllama: boolean = false

  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
      })
      this.useOllama = response.ok
      return response.ok
    } catch {
      this.useOllama = false
      return false
    }
  }

  async analyzeText(text: string): Promise<AIAnalysisResult> {
    if (this.useOllama) {
      try {
        return await this.analyzeWithOllama(text)
      } catch (error) {
        console.error('Ollama analysis failed, falling back to rule-based:', error)
      }
    }

    return this.analyzeWithRules(text)
  }

  private async analyzeWithOllama(text: string): Promise<AIAnalysisResult> {
    const prompt = `Analyze this text and provide a JSON response with the following fields:
- category: one of "journal", "todo", "reminder", or "note"
- tags: array of relevant tags (2-5 tags)
- priority: one of "urgent-important", "not-urgent-important", "urgent-not-important", "not-urgent-not-important" (only if it's a task)
- suggestedDate: ISO date string if a specific date is mentioned
- suggestedTitle: a brief title (5-8 words max)

Text: "${text}"

Respond ONLY with valid JSON, no additional text.`

    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error('Ollama API request failed')
    }

    const data: OllamaResponse = await response.json()
    const result = JSON.parse(data.response)

    return {
      category: result.category as EntryCategory,
      tags: result.tags || [],
      priority: result.priority as Priority | undefined,
      suggestedDate: result.suggestedDate ? new Date(result.suggestedDate) : undefined,
      suggestedTitle: result.suggestedTitle,
      confidence: 0.85,
    }
  }

  private analyzeWithRules(text: string): AIAnalysisResult {
    const lowerText = text.toLowerCase()

    // Determine category
    let category: EntryCategory = 'note'
    let priority: Priority | undefined

    // TODO detection - more comprehensive
    const todoIndicators = [
      'todo', 'task', 'need to', 'have to', 'must', 'should',
      'going to', 'plan to', 'want to', 'will',
      'remember to', 'make sure', 'check', 'call', 'email',
      'buy', 'get', 'pick up', 'finish', 'complete', 'start',
      'schedule', 'book', 'arrange', 'prepare', 'organize'
    ]

    const hasTodoIndicator = todoIndicators.some(indicator => lowerText.includes(indicator))

    // REMINDER detection
    const reminderIndicators = [
      'remind', 'reminder', 'don\'t forget', 'remember',
      'important to', 'note to self', 'heads up'
    ]

    const hasReminderIndicator = reminderIndicators.some(indicator => lowerText.includes(indicator))

    // JOURNAL detection
    const journalIndicators = [
      'feeling', 'felt', 'thought', 'thinking', 'today i',
      'dear diary', 'grateful', 'thankful', 'happy', 'sad',
      'excited', 'worried', 'noticed', 'realized'
    ]

    const hasJournalIndicator = journalIndicators.some(indicator => lowerText.includes(indicator))

    // Categorize based on strongest indicators
    if (hasReminderIndicator) {
      category = 'reminder'
    } else if (hasTodoIndicator) {
      category = 'todo'

      // Determine priority for todos
      const urgentKeywords = ['urgent', 'asap', 'immediately', 'now', 'today', 'emergency', 'critical']
      const importantKeywords = ['important', 'crucial', 'essential', 'vital', 'key', 'priority', 'must']

      const isUrgent = urgentKeywords.some(keyword => lowerText.includes(keyword))
      const isImportant = importantKeywords.some(keyword => lowerText.includes(keyword))

      if (isUrgent && isImportant) priority = 'urgent-important'
      else if (!isUrgent && isImportant) priority = 'not-urgent-important'
      else if (isUrgent && !isImportant) priority = 'urgent-not-important'
      else priority = 'not-urgent-not-important'
    } else if (hasJournalIndicator) {
      category = 'journal'
    }

    // Extract tags
    const tags: string[] = []
    const tagKeywords = [
      'work', 'personal', 'health', 'fitness', 'exercise', 'workout',
      'finance', 'money', 'budget', 'family', 'friends', 'social',
      'project', 'meeting', 'appointment', 'shopping', 'groceries',
      'urgent', 'important', 'study', 'learning', 'reading',
      'home', 'chores', 'cleaning', 'cooking', 'travel', 'vacation'
    ]

    for (const keyword of tagKeywords) {
      if (lowerText.includes(keyword)) {
        tags.push(keyword)
      }
    }

    // Extract date mentions - check for any date-related text
    let suggestedDate: Date | undefined
    const datePatterns = [
      /today/i,
      /tomorrow/i,
      /day after tomorrow/i,
      /next week/i,
      /this week/i,
      /next month/i,
      /this month/i,
      /weekend/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /in \d+ days?/i,
      /\d{1,2}[\/\-]\d{1,2}/,
    ]

    for (const pattern of datePatterns) {
      if (pattern.test(lowerText)) {
        suggestedDate = this.extractDate(text)
        break
      }
    }

    // If no date found but it's a todo/reminder, default to tomorrow
    if (!suggestedDate && (category === 'todo' || category === 'reminder')) {
      // Check if it doesn't explicitly say "someday" or similar vague terms
      const vagueTerms = ['someday', 'eventually', 'sometime', 'later']
      const hasVagueTerm = vagueTerms.some(term => lowerText.includes(term))

      if (!hasVagueTerm) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        suggestedDate = tomorrow
      }
    }

    // Generate title - clean and concise
    const words = text.split(' ').slice(0, 8)
    let suggestedTitle = words.join(' ') + (text.split(' ').length > 8 ? '...' : '')

    // Remove common prefixes for cleaner titles
    const prefixesToRemove = ['todo ', 'task ', 'remind me to ', 'reminder ', 'i need to ', 'i have to ', 'i must ', 'i should ', 'i want to ', 'i will ']
    for (const prefix of prefixesToRemove) {
      if (suggestedTitle.toLowerCase().startsWith(prefix)) {
        suggestedTitle = suggestedTitle.substring(prefix.length)
        suggestedTitle = suggestedTitle.charAt(0).toUpperCase() + suggestedTitle.slice(1)
        break
      }
    }

    return {
      category,
      tags: tags.length > 0 ? tags : ['general'],
      priority,
      suggestedDate,
      suggestedTitle,
      confidence: 0.7,
    }
  }

  private extractDate(text: string): Date | undefined {
    const now = new Date()
    const lowerText = text.toLowerCase()

    // Today
    if (lowerText.includes('today')) {
      return new Date(now)
    }

    // Tomorrow
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return tomorrow
    }

    // Day after tomorrow
    if (lowerText.includes('day after tomorrow') || lowerText.includes('overmorrow')) {
      const dayAfter = new Date(now)
      dayAfter.setDate(dayAfter.getDate() + 2)
      dayAfter.setHours(0, 0, 0, 0)
      return dayAfter
    }

    // Next week
    if (lowerText.includes('next week')) {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(0, 0, 0, 0)
      return nextWeek
    }

    // Next month
    if (lowerText.includes('next month')) {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setHours(0, 0, 0, 0)
      return nextMonth
    }

    // This weekend
    if (lowerText.includes('this weekend') || lowerText.includes('weekend')) {
      const saturday = new Date(now)
      const daysUntilSaturday = 6 - now.getDay()
      saturday.setDate(saturday.getDate() + (daysUntilSaturday <= 0 ? 7 + daysUntilSaturday : daysUntilSaturday))
      saturday.setHours(0, 0, 0, 0)
      return saturday
    }

    // Day names (next occurrence)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        // Check if it's "next [day]"
        const isNext = lowerText.includes(`next ${days[i]}`)
        const targetDay = i
        const currentDay = now.getDay()
        let daysToAdd = targetDay - currentDay

        if (daysToAdd <= 0 || isNext) {
          daysToAdd += 7
        }

        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + daysToAdd)
        targetDate.setHours(0, 0, 0, 0)
        return targetDate
      }
    }

    // In X days
    const inDaysMatch = lowerText.match(/in (\d+) days?/)
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1])
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + days)
      targetDate.setHours(0, 0, 0, 0)
      return targetDate
    }

    // Specific date formats (MM/DD, MM-DD, etc.)
    const dateMatch = lowerText.match(/(\d{1,2})[\/\-](\d{1,2})/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1 // 0-indexed
      const day = parseInt(dateMatch[2])
      const targetDate = new Date(now.getFullYear(), month, day)
      targetDate.setHours(0, 0, 0, 0)

      // If the date has passed this year, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(targetDate.getFullYear() + 1)
      }

      return targetDate
    }

    return undefined
  }
}

export const aiService = new AIService()
