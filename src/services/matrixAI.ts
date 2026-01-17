import Groq from 'groq-sdk'
import { db } from '../lib/db'
import type { Priority } from '../types'

interface AnalyzedItem {
  id: string
  title: string
  content: string
  date: Date
  priority: Priority
  tags: string[]
  source: 'transcription' | 'entry' | 'diary'
  completed?: boolean
}

export async function analyzeAllDataForMatrix(): Promise<AnalyzedItem[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Groq API key not found. Please add VITE_GROQ_API_KEY to your environment variables.')
  }

  // Simple! Just fetch from unified table
  const entries = await db.entries.toArray()

  // Map to analyzed items
  const allItems: AnalyzedItem[] = entries.map((e) => ({
    id: e.id,
    title: e.title || e.content.substring(0, 50) + (e.content.length > 50 ? '...' : ''),
    content: e.content,
    date: e.date,
    priority: e.priority || 'not-urgent-not-important',
    tags: e.tags || [],
    source: e.source === 'voice' ? 'transcription' : e.source === 'diary' ? 'diary' : 'entry',
    completed: e.completed,
  }))

  // If no items, return empty array
  if (allItems.length === 0) {
    return []
  }

  // Prepare data for AI analysis
  const itemsSummary = allItems.map((item, index) => ({
    index,
    title: item.title,
    content: item.content.substring(0, 200),
    date: item.date.toISOString(),
    currentPriority: item.priority,
  }))

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })

  try {
    const systemPrompt = `You are an expert at analyzing tasks and categorizing them using the Eisenhower Matrix (urgent-important, not-urgent-important, urgent-not-important, not-urgent-not-important).

Analyze each item and assign a priority based on:
1. **Urgency**: How soon does it need to be done? Consider:
   - Items with deadlines in the past or within 24 hours are URGENT
   - Items with words like "urgent", "ASAP", "immediately", "today" are URGENT
   - Items with deadlines more than 48 hours away are NOT URGENT

2. **Importance**: How much does it matter? Consider:
   - Items related to health, relationships, career goals, deadlines are IMPORTANT
   - Items that are learning, growth, planning are IMPORTANT
   - Items that are distractions, time-wasters, busy work are NOT IMPORTANT

Return ONLY a JSON array with objects containing:
- index: number (same as input)
- priority: "urgent-important" | "not-urgent-important" | "urgent-not-important" | "not-urgent-not-important"

Do not include any explanation, just the JSON array.`

    const userPrompt = `Analyze these items and categorize them:\n\n${JSON.stringify(itemsSummary, null, 2)}`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
    })

    const aiResponse = completion.choices[0]?.message?.content || '[]'

    // Parse AI response
    let analysis: { index: number; priority: Priority }[] = []
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      // Return items with default priorities
      return allItems
    }

    // Update priorities based on AI analysis
    for (const result of analysis) {
      if (result.index >= 0 && result.index < allItems.length) {
        allItems[result.index].priority = result.priority
      }
    }

    return allItems
  } catch (error: any) {
    console.error('AI analysis failed:', error)
    // Return items with current priorities
    return allItems
  }
}
