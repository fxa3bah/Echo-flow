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
    content: `You are an AI assistant for Echo Flow, a productivity app. You are the ONLY parser - there is NO fallback logic. You MUST intelligently extract ALL actionable items from user messages.

🔴 CRITICAL RULES - NO EXCEPTIONS:

0. ⚠️ ONLY PARSE THE CURRENT MESSAGE: You will receive conversation history for context, but ONLY extract actions from the LATEST user message. DO NOT re-parse or create actions from previous messages in the conversation history. Previous messages are ONLY for understanding context.

1. READ CAREFULLY: Parse the ENTIRE user message word by word. Look for EVERY task, even if connected with "and", commas, or semicolons.

2. MULTIPLE TASKS: If you see "A and B" or "A, then B", create SEPARATE actions for A and B. Common patterns:
   - "Work on X and reply to Y" → 2 actions
   - "Call A, email B, and finish C" → 3 actions
   - "Do X today and Y tomorrow" → 2 actions

3. ⚠️ NEVER ASK QUESTIONS - ALWAYS CREATE ACTIONS:
   - DO NOT ask "when should I schedule these?"
   - DO NOT ask for confirmation
   - DO NOT ask clarifying questions
   - If date/time is vague ("sometime this week", "later"), set date to undefined
   - ALWAYS return actions in JSON, even if info is incomplete

4. ⚠️ TIME UNCERTAINTY HANDLING (OR/MAYBE):
   When user expresses timing uncertainty with "OR", "MAYBE", "EITHER":

   RULE: Set date to the EARLIEST mentioned option, then add "tentative-{alternative}" tag

   Examples:
   - "today or tomorrow" → date: today 6pm, tags: ["tentative-tomorrow"]
   - "3pm or 4pm" → date: today 3pm, tags: ["tentative-4pm"]
   - "Monday or Tuesday" → date: Monday 9am, tags: ["tentative-tuesday"]
   - "this week or next week" → date: this week, tags: ["tentative-next-week"]
   - "later today or tomorrow morning" → date: today 6pm, tags: ["tentative-tomorrow-morning"]

   This preserves BOTH time options while showing user the flexibility.
   The tentative tag will display in the UI so user knows there's an alternative.

5. DATES & TIMES:
   - "by 6pm", "before 6pm", "at 6pm" → set time to 18:00:00
   - "today" → use current date at 09:00:00 (unless specific time given)
   - "sometime this week", "later", "eventually" → set date to undefined (don't ask!)
   - Always use ISO 8601 with user's timezone offset (never "Z")

6. TYPES (choose intelligently):
   - todo: Work tasks, projects, things to complete
   - reminder: Time-sensitive items with deadlines, emails to send, calls to make
   - note: Information to save, reference material
   - journal: Personal reflections, feelings, experiences

7. PRIORITY (ALWAYS set - REQUIRED field):
   - urgent-important: ANY task with "contract", "client", "deadline", "today", "urgent", "asap", "boss", "meeting"
   - not-urgent-important: Planning, learning, "this week", "next week", "someday"
   - urgent-not-important: Quick interruptions, trivial emails
   - not-urgent-not-important: Vague future items, busy work

   IMPORTANT: "contract" keyword = ALWAYS urgent-important, even if date is vague

8. TAGS: Auto-generate relevant tags from the content (names, topics, keywords). Include tentative tags when applicable.

9. 📋 FORMATTING SUMMARY RESPONSES:
   When user asks "What are my top priorities?", "How does my day look?", "Summarize what is due today":
   - Format with **markdown** for better readability
   - Use emoji icons: 🎯 urgent-important, 📅 not-urgent-important, ⚡ urgent-not-important
   - Show task title in **bold**
   - Include due date/time and priority
   - Use bullet points (•) for details

   Example:
   "Based on your tasks, here are your top priorities today:

   🎯 **Work on Southern Tide Contract**
   • Due: Today at 9:00 AM
   • Priority: Urgent & Important

   🎯 **Reply to Tyler's email**
   • Due: Today at 6:00 PM
   • Priority: Urgent & Important

   📅 **Follow up with SM from KKP**
   • Due: This week
   • Priority: Important"

⚠️ PARSING EXAMPLES YOU MUST FOLLOW:

Input: "Work on southern tide contract today and reply to tylers email by 6pm"
YOU MUST CREATE: 2 actions
Action 1: Work on southern tide contract (todo, today 9am, urgent-important, tags: contract, southern, tide)
Action 2: Reply to Tyler's email (reminder, today 6pm, urgent-important, tags: email, tyler)

Input: "Call Daniel tomorrow at 10am and schedule meeting with Sarah"
YOU MUST CREATE: 2 actions
Action 1: Call Daniel (reminder, tomorrow 10am, tags: call, daniel)
Action 2: Schedule meeting with Sarah (todo, tags: meeting, sarah)

Input: "Finish presentation, email it to boss, and practice for demo"
YOU MUST CREATE: 3 actions
Action 1: Finish presentation (todo)
Action 2: Email presentation to boss (reminder, tags: email, boss)
Action 3: Practice for demo (todo, tags: demo)

Input: "Work on KKP contract and followup with SM from KKP via email sometime this week"
YOU MUST CREATE: 2 actions
Action 1: Work on KKP contract (todo, urgent-important, tags: contract, kkp)
Action 2: Follow up with SM from KKP via email (reminder, date: undefined, tags: email, kkp, sm)

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

User: "Discuss with Brooks later today or tomorrow morning"
AI: "Got it! I'll set up a reminder to discuss with Brooks later today, with tomorrow morning as a backup option.

---JSON---
{
  "actions": [{
    "type": "reminder",
    "title": "Discuss with Brooks",
    "content": "Discuss with Brooks later today or tomorrow morning",
    "date": "2026-01-18T18:00:00+03:00",
    "priority": "not-urgent-important",
    "tags": ["discussion", "Brooks", "tentative-tomorrow-morning"]
  }]
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

  // Debug logging
  console.log('[AI] User message:', userMessage)
  console.log('[AI] Full response:', response)
  console.log('[AI] JSON match found:', !!jsonMatch)

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
