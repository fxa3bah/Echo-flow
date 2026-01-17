import { useEffect, useRef, useState } from 'react'
import { getAIInsights, type ChatMessage } from '../services/groqChatService'
import { useSpeechRecognition } from './useSpeechRecognition'
import { applyAIActions, buildAIContextSummary, type AIAction } from '../services/aiActions'

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: AIAction[]
  pendingActions?: AIAction[]
  rejectedActionIndices?: number[]
}

interface UseAIChatOptions {
  initialMessages?: AIChatMessage[]
}

export function useAIChat({ initialMessages = [] }: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<AIChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionsCreated, setActionsCreated] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const storageKeyRef = useRef('echo-flow-ai-chat')

  const speechRecognition = useSpeechRecognition()

  useEffect(() => {
    if (speechRecognition.transcript && isListening) {
      setInput(speechRecognition.transcript)
    }
  }, [speechRecognition.transcript, isListening])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(storageKeyRef.current)
      if (stored) {
        setMessages(JSON.parse(stored) as AIChatMessage[])
      } else if (initialMessages.length > 0) {
        setMessages(initialMessages)
      }
    } catch {
      if (initialMessages.length > 0) {
        setMessages(initialMessages)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKeyRef.current, JSON.stringify(messages))
  }, [messages])

  const handleVoiceToggle = () => {
    if (isListening) {
      speechRecognition.stopListening()
      setIsListening(false)
    } else {
      speechRecognition.resetTranscript()
      speechRecognition.startListening()
      setIsListening(true)
    }
  }

  const buildPendingState = (actions: AIAction[]) => {
    const pendingActions = actions.length > 0 ? actions : undefined
    const missingDueActions = (pendingActions || []).filter(
      (action) => (action.type === 'todo' || action.type === 'reminder') && !action.date
    )
    const followUpPrompt = missingDueActions.length > 0
      ? `\n\nQuick question: when should I schedule ${missingDueActions.length === 1 ? `"${missingDueActions[0].title}"` : 'these items'}?`
      : ''
    return { pendingActions, followUpPrompt }
  }

  const extractLocalDate = (message: string, fallback = new Date()) => {
    const lower = message.toLowerCase()
    const base = new Date(fallback)
    if (lower.includes('tomorrow')) {
      base.setDate(base.getDate() + 1)
    } else if (lower.includes('today')) {
      base.setHours(base.getHours())
    }
    return base
  }

  const extractTimeFromMessage = (message: string) => {
    const match = message.match(/\b(?:before|by|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
    if (!match) return null
    const hour = Number(match[1])
    const minute = match[2] ? Number(match[2]) : 0
    const meridiem = match[3].toLowerCase()
    let adjustedHour = hour % 12
    if (meridiem === 'pm') {
      adjustedHour += 12
    }
    return { hour: adjustedHour, minute }
  }

  const deriveTags = (text: string) => {
    const stopwords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'your', 'you', 'today'])
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((word) => word.length > 3 && !stopwords.has(word))
      )
    ).slice(0, 3)
  }

  const ensureTags = (action: AIAction) => {
    if (action.tags && action.tags.length > 0) return action
    const tags = deriveTags(`${action.title} ${action.content}`)
    return { ...action, tags }
  }

  const normalizeActions = (message: string, actions: AIAction[]) => {
    const lower = message.toLowerCase()
    const baseDate = extractLocalDate(message)
    const time = extractTimeFromMessage(message)
    const next = [...actions]

    const hasReply = actions.some((action) => /reply|respond|email/i.test(`${action.title} ${action.content}`))
    if ((lower.includes('reply') || lower.includes('email')) && !hasReply) {
      const nameMatch = message.match(/reply to\s+([a-zA-Z]+)(?:'s)?\s+email/i)
      const person = nameMatch ? nameMatch[1] : 'their'
      const replyDate = new Date(baseDate)
      if (time) {
        replyDate.setHours(time.hour, time.minute, 0, 0)
      }
      next.push({
        type: 'todo',
        title: `Reply to ${person}'s email`,
        content: `Reply to ${person}'s email`,
        date: time ? replyDate : undefined,
        tags: ['email', person.toLowerCase()],
      })
    }

    const hasCall = actions.some((action) => /call/i.test(`${action.title} ${action.content}`))
    const callMatch = message.match(/call\s+([a-zA-Z]+)/i)
    if (callMatch && !hasCall) {
      const person = callMatch[1]
      next.push({
        type: 'reminder',
        title: `Call ${person}`,
        content: `Call ${person}`,
        date: undefined,
        tags: ['call', person.toLowerCase()],
      })
    }

    return next.map((action) => {
      const titleContent = `${action.title} ${action.content}`
      if (!action.date && time && /reply|respond|email/i.test(titleContent)) {
        const dated = new Date(baseDate)
        dated.setHours(time.hour, time.minute, 0, 0)
        return ensureTags({ ...action, date: dated })
      }

      if (!action.date && /today/i.test(message)) {
        const dated = new Date(baseDate)
        dated.setHours(9, 0, 0, 0)
        return ensureTags({ ...action, date: dated })
      }

      return ensureTags(action)
    })
  }

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    const trimmedMessage = userMessage.trim()
    setInput('')
    speechRecognition.resetTranscript()
    setIsListening(false)
    speechRecognition.stopListening()

    setMessages((prev) => [...prev, { role: 'user', content: trimmedMessage }])
    setIsLoading(true)

    try {
      const conversationHistory: ChatMessage[] = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const contextSummary = await buildAIContextSummary()
      const insight = await getAIInsights(trimmedMessage, conversationHistory, contextSummary)

      const normalizedActions = normalizeActions(trimmedMessage, insight.actions)
      const { pendingActions, followUpPrompt } = buildPendingState(normalizedActions)

      // Store actions as pending instead of auto-applying
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${insight.response}${followUpPrompt}`,
          pendingActions,
          rejectedActionIndices: [],
        },
      ])

      // No automatic diary append; entries are created when actions are accepted.
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}. Please make sure your Groq API key is configured.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    await sendMessage(input)
  }

  const handleSendMessage = async (message: string) => {
    if (isLoading) return
    await sendMessage(message)
  }

  const handleClearChat = () => {
    setMessages(initialMessages)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKeyRef.current)
    }
  }

  const handleAcceptAction = async (messageIndex: number, actionIndex: number, action: AIAction) => {
    try {
      // Apply the action to the database
      const actionResult = await applyAIActions([action], new Date())

      const createdCount = actionResult.created + actionResult.updated + (actionResult.diaryUpdated ? 1 : 0)

      if (createdCount > 0) {
        setActionsCreated(createdCount)
        setTimeout(() => setActionsCreated(0), 3000)
      }

      // Remove from pending actions
      setMessages((prev) =>
        prev.map((msg, idx) => {
          if (idx === messageIndex && msg.pendingActions) {
            const newPending = msg.pendingActions.filter((_, i) => i !== actionIndex)
            return {
              ...msg,
              pendingActions: newPending.length > 0 ? newPending : undefined,
            }
          }
          return msg
        })
      )
    } catch (error) {
      console.error('Failed to accept action:', error)
    }
  }

  const handleRejectAction = (messageIndex: number, actionIndex: number) => {
    setMessages((prev) =>
      prev.map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            rejectedActionIndices: [...(msg.rejectedActionIndices || []), actionIndex],
          }
        }
        return msg
      })
    )
  }

  const handleAcceptAll = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message?.pendingActions) return

    try {
      // Apply all pending actions
      const actionResult = await applyAIActions(message.pendingActions, new Date())

      const createdCount = actionResult.created + actionResult.updated + (actionResult.diaryUpdated ? 1 : 0)

      if (createdCount > 0) {
        setActionsCreated(createdCount)
        setTimeout(() => setActionsCreated(0), 3000)
      }

      // Clear pending actions
      setMessages((prev) =>
        prev.map((msg, idx) => {
          if (idx === messageIndex) {
            return {
              ...msg,
              pendingActions: undefined,
            }
          }
          return msg
        })
      )
    } catch (error) {
      console.error('Failed to accept all actions:', error)
    }
  }

  const handleUpdatePendingAction = (
    messageIndex: number,
    actionIndex: number,
    updates: Partial<AIAction>
  ) => {
    setMessages((prev) =>
      prev.map((msg, idx) => {
        if (idx !== messageIndex || !msg.pendingActions) {
          return msg
        }

        const nextPending = msg.pendingActions.map((action, i) =>
          i === actionIndex ? { ...action, ...updates } : action
        )

        return {
          ...msg,
          pendingActions: nextPending,
        }
      })
    )
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    actionsCreated,
    isListening,
    handleVoiceToggle,
    handleSend,
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAll,
    handleUpdatePendingAction,
    handleSendMessage,
    handleClearChat,
    messagesEndRef,
    speechRecognition,
  }
}
