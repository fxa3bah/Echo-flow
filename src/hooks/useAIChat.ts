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
    if (speechRecognition.transcript) {
      setInput(speechRecognition.transcript)
    }
  }, [speechRecognition.transcript])

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

  const inferPriority = (message: string, title: string, content: string, hasTime: boolean) => {
    const fullText = `${message} ${title} ${content}`.toLowerCase()

    // Urgent + Important keywords
    const isUrgent = /today|urgent|asap|immediately|deadline|now|tonight|this morning|this afternoon/.test(fullText) || hasTime
    const isImportant = /contract|client|meeting|deliverable|project|important|critical|essential|boss|manager/.test(fullText)

    if (isUrgent && isImportant) return 'urgent-important'
    if (!isUrgent && isImportant) return 'not-urgent-important'
    if (isUrgent && !isImportant) return 'urgent-not-important'
    return 'not-urgent-not-important'
  }

  const normalizeActions = (message: string, actions: AIAction[]) => {
    // REMOVED: Manual regex parsing and supplementary action creation
    // The Groq AI should intelligently parse ALL tasks from the user's message
    // This function now ONLY enriches what the AI returned (tags, priorities)

    console.log('[normalizeActions] Input actions from AI:', actions)
    console.log('[normalizeActions] Message:', message)

    // Only enrich the actions the AI returned - no manual parsing
    return actions.map((action) => {
      let updatedAction = { ...action }

      // Infer priority if missing (AI should set this, but fallback just in case)
      if (!updatedAction.priority) {
        updatedAction.priority = inferPriority(message, action.title, action.content, !!action.date)
      }

      // Ensure tags are present
      return ensureTags(updatedAction)
    })
  }

  // Add logging just before normalizeActions is called in sendMessage
  const logActions = (label: string, actions: AIAction[]) => {
    console.log(`[${label}] Total actions:`, actions.length)
    actions.forEach((action, i) => {
      console.log(`[${label}] Action ${i + 1}:`, {
        type: action.type,
        title: action.title,
        date: action.date,
        priority: action.priority,
        tags: action.tags
      })
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

      console.log('[useAIChat] AI returned actions:', insight.actions)
      logActions('Before normalize', insight.actions)

      const normalizedActions = normalizeActions(trimmedMessage, insight.actions)

      console.log('[useAIChat] After normalization:', normalizedActions)
      logActions('After normalize', normalizedActions)

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
