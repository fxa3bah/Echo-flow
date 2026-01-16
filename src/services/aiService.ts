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

    if (
      lowerText.includes('todo') ||
      lowerText.includes('task') ||
      lowerText.includes('need to') ||
      lowerText.includes('have to') ||
      lowerText.includes('must')
    ) {
      category = 'todo'

      // Determine priority for todos
      const isUrgent = lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('immediately')
      const isImportant = lowerText.includes('important') || lowerText.includes('critical') || lowerText.includes('crucial')

      if (isUrgent && isImportant) priority = 'urgent-important'
      else if (!isUrgent && isImportant) priority = 'not-urgent-important'
      else if (isUrgent && !isImportant) priority = 'urgent-not-important'
      else priority = 'not-urgent-not-important'
    } else if (
      lowerText.includes('remind') ||
      lowerText.includes('reminder') ||
      lowerText.includes('don\'t forget')
    ) {
      category = 'reminder'
    } else if (
      lowerText.includes('today') ||
      lowerText.includes('feeling') ||
      lowerText.includes('thought') ||
      lowerText.includes('dear diary')
    ) {
      category = 'journal'
    }

    // Extract tags
    const tags: string[] = []
    const tagKeywords = [
      'work', 'personal', 'health', 'fitness', 'finance', 'family',
      'project', 'meeting', 'shopping', 'urgent', 'important'
    ]

    for (const keyword of tagKeywords) {
      if (lowerText.includes(keyword)) {
        tags.push(keyword)
      }
    }

    // Extract date mentions
    let suggestedDate: Date | undefined
    const datePatterns = [
      /tomorrow/i,
      /next week/i,
      /next month/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    ]

    for (const pattern of datePatterns) {
      if (pattern.test(text)) {
        suggestedDate = this.extractDate(text)
        break
      }
    }

    // Generate title
    const words = text.split(' ').slice(0, 8)
    const suggestedTitle = words.join(' ') + (text.split(' ').length > 8 ? '...' : '')

    return {
      category,
      tags: tags.length > 0 ? tags : ['general'],
      priority,
      suggestedDate,
      suggestedTitle,
      confidence: 0.6,
    }
  }

  private extractDate(text: string): Date | undefined {
    const now = new Date()
    const lowerText = text.toLowerCase()

    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }

    if (lowerText.includes('next week')) {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        const targetDay = i
        const currentDay = now.getDay()
        let daysToAdd = targetDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + daysToAdd)
        return targetDate
      }
    }

    return undefined
  }
}

export const aiService = new AIService()
