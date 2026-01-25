// Groq Chat API Service - Refined Logic Engine
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
  if (!apiKey || apiKey === 'gsk_your-api-key-here') throw new Error('Groq API key not configured')

  try {
    const response = await fetch(GROQ_CHAT_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.1, // Lower temperature for more consistent JSON/logic
        max_tokens: 1000,
      }),
    })
    if (!response.ok) throw new Error(`Groq API error: ${response.status}`)
    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error: any) {
    throw new Error(`AI Offline: ${error.message}`)
  }
}

export async function getAIInsights(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  contextSummary = ''
): Promise<AIInsight> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are the core intelligence of Echo Flow. You operate in two distinct modes. You MUST choose one based on the user's intent.

---
### MODE 1: THE COLLECTOR (Commands)
**Trigger**: User wants to add/remind/note something NEW.
1. **Logic**: ONLY capture items that are NOT already in the 'Current Context' provided to you.
2. **JSON**: Extract the new items.
3. **Response**: A single line confirmation: "✅ **Captured** • [Short Title]"

---
### MODE 2: THE STRATEGIST (Queries)
**Trigger**: User asks "How's my day?", "What's next?", "Next week?", etc.
1. **JSON**: "actions": []
2. **Response Style**: "Quiet Premium". NO HEADERS (no ###). 
3. **Sections**:
   ☀️ **Today** • [Status]
   🔴 **Overdue** • [Task | Status]
   🌕 **Tomorrow** • [Task | Time]
   📅 **Next Week** • [Task | Date]
4. **Rules**: 
   - NEVER use the phrase "Strategic Dashboard".
   - If a section is empty, OMIST it (except Today).
   - Use exactly one newline between sections.

Example Query Response:
☀️ **Today** • Clear
🌕 **Tomorrow**
**Southern Tide** | 9:00 AM

Anything else to sync?
---JSON---
{ "actions": [] }
---END---`
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const localTimestamp = new Date().toLocaleString(undefined, { timeZone, timeZoneName: 'short' })

  const messages: ChatMessage[] = [
    systemPrompt,
    { role: 'system', content: `Current Context:\n${contextSummary}\n\nLocal Time: ${localTimestamp}` },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  const response = await chatWithGroq(messages)
  const jsonMatch = response.match(/---JSON---\n?([\s\S]*?)\n?---END---/)
  let actions: AIInsight['actions'] = []

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      actions = (parsed.actions || []).map((action: any) => ({
        ...action,
        date: action.date ? new Date(action.date) : undefined,
      }))
    } catch (e) { console.error('JSON Parse Fail', e) }
  }

  // Robust cleaning of markers from text response
  const displayResponse = response
    .replace(/---?JSON---?[\s\S]*?---?END---?/gi, '')
    .split('---JSON---')[0] // Fallback safety
    .trim()

  return { response: displayResponse, actions }
}
