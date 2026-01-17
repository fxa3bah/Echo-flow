// Groq Chat API Service - For AI Insights

const GROQ_CHAT_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIInsight {
  response: string
  actions: {
    type: 'todo' | 'reminder' | 'note' | 'journal'
    title: string
    content: string
    date?: Date
    priority?: string
    tags?: string[]
  }[]
}

export async function chatWithGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey || apiKey === 'gsk_your-api-key-here') {
    throw new Error('Groq API key not configured')
  }

  try {
    const response = await fetch(GROQ_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error: any) {
    console.error('Groq chat error:', error)
    throw new Error(`Failed to chat with AI: ${error.message}`)
  }
}

export async function getAIInsights(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  contextSummary = ''
): Promise<AIInsight> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant for Echo Flow, a productivity app. Your job is to:
1. Have a natural conversation with the user
2. Extract actionable items (todos, reminders, notes, journal entries) from the conversation
3. Respond in a friendly, helpful manner
4. Use the provided app context to avoid duplicates and update existing items when appropriate
5. When you identify actionable items, format them as JSON at the end of your response
6. If a todo/reminder has no clear due date or time, ask a concise follow-up question and suggest 2-3 quick options the user can pick from
7. When including dates, always use ISO 8601 with the user's timezone offset (never use "Z" unless the user explicitly says UTC)
8. Never merge unrelated tasks into a single action; create separate actions for each distinct person, deliverable, or verb (e.g., "call Daniel" must be separate from "work on Southern Tide contract")
9. If the user specifies an exact time (e.g., "by 5pm", "before 6pm"), set the action date to that exact local time
10. ALWAYS set priority based on these STRICT rules:
   - urgent-important: Contract work, client deliverables, items with "today"/"urgent"/"asap"/"deadline" keywords, health/safety issues
   - not-urgent-important: Planning, learning, relationship building, items with "this week"/"next week"
   - urgent-not-important: Interruptions, some emails, items with "quick" but not critical
   - not-urgent-not-important: Busy work, time wasters, vague future items
11. ALWAYS categorize types correctly:
   - todo: Work tasks, projects, things to complete
   - reminder: Time-sensitive items with specific times/deadlines, emails to reply to, calls to make
   - note: Information to save, reference material
   - journal: Personal reflections, feelings, daily experiences

Response format:
[Your natural response to the user]

---JSON---
{
  "actions": [
    {
      "type": "todo|reminder|note|journal",
      "title": "Brief title",
      "content": "Full content",
      "date": "ISO date string if applicable",
      "priority": "urgent-important|not-urgent-important|urgent-not-important|not-urgent-not-important",
      "tags": ["tag1", "tag2"]
    }
  ]
}
---END---

Examples:
User: "I need to call Daniel tomorrow at 10am about the project"
AI: "Got it! I'll create a reminder for you to call Daniel tomorrow at 10am about the project.

---JSON---
{
  "actions": [{
    "type": "reminder",
    "title": "Call Daniel about project",
    "content": "Call Daniel tomorrow at 10am about the project",
    "date": "2026-01-19T10:00:00+03:00",
    "priority": "urgent-important",
    "tags": ["call", "project"]
  }]
}
---END---

User: "Work on Southern Tide Contract today and reply to Tyler's email before 6pm"
AI: "I'll set up those tasks for you - working on the Southern Tide Contract and replying to Tyler's email by 6pm.

---JSON---
{
  "actions": [
    {
      "type": "todo",
      "title": "Work on Southern Tide Contract",
      "content": "Work on Southern Tide Contract today",
      "date": "2026-01-18T09:00:00+03:00",
      "priority": "urgent-important",
      "tags": ["contract", "Southern Tide"]
    },
    {
      "type": "reminder",
      "title": "Reply to Tyler's email",
      "content": "Reply to Tyler's email before 6pm",
      "date": "2026-01-18T18:00:00+03:00",
      "priority": "urgent-important",
      "tags": ["email", "Tyler"]
    }
  ]
}
---END---

User: "Today was amazing! I finished my presentation and got great feedback."
AI: "That's wonderful news! Sounds like you had a very productive day. I'll save this moment for you.

---JSON---
{
  "actions": [{
    "type": "journal",
    "title": "Amazing day with presentation success",
    "content": "Today was amazing! I finished my presentation and got great feedback.",
    "date": "2026-01-18T09:00:00+03:00",
    "tags": ["success", "presentation"]
  }]
}
---END---

Be conversational, helpful, and always extract actionable items when present.`
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const localTimestamp = new Date().toLocaleString(undefined, {
    timeZone,
    timeZoneName: 'short',
  })

  const messages: ChatMessage[] = [
    systemPrompt,
    {
      role: 'system',
      content: `User timezone: ${timeZone}. Current local date/time: ${localTimestamp}.`,
    },
    ...(contextSummary
      ? [{ role: 'system' as const, content: `App context:\n${contextSummary}` }]
      : []),
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  const response = await chatWithGroq(messages)

  // Parse response to extract actions
  const jsonMatch = response.match(/---JSON---\n([\s\S]*?)\n---END---/)
  let actions: AIInsight['actions'] = []

  const parseAIActionDate = (dateValue?: string) => {
    if (!dateValue) return undefined
    if (dateValue.endsWith('Z')) {
      const trimmed = dateValue.replace('Z', '')
      const [datePart, timePart = '00:00:00'] = trimmed.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number)
      return new Date(year, (month || 1) - 1, day || 1, hour, minute, second)
    }
    return new Date(dateValue)
  }

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      actions = parsed.actions.map((action: any) => ({
        ...action,
        date: parseAIActionDate(action.date),
      }))
    } catch (error) {
      console.error('Failed to parse AI actions:', error)
    }
  }

  // Remove JSON from display response
  const displayResponse = response.replace(/---JSON---[\s\S]*?---END---/g, '').trim()

  return {
    response: displayResponse,
    actions,
  }
}
