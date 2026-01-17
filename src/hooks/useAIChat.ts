import { useEffect, useRef, useState } from 'react'
import { getAIInsights, type ChatMessage } from '../services/groqChatService'
import { useSpeechRecognition } from './useSpeechRecognition'
import { applyAIActions, appendToDiaryEntry, buildAIContextSummary, type AIAction } from '../services/aiActions'

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

  const speechRecognition = useSpeechRecognition()

  useEffect(() => {
    if (speechRecognition.transcript && isListening) {
      setInput(speechRecognition.transcript)
    }
  }, [speechRecognition.transcript, isListening])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

      const pendingActions = insight.actions.length > 0 ? insight.actions : undefined
      const missingDueActions = (pendingActions || []).filter(
        (action) => (action.type === 'todo' || action.type === 'reminder') && !action.date
      )
      const followUpPrompt = missingDueActions.length > 0
        ? `\n\nQuick question: when should I schedule ${missingDueActions.length === 1 ? `"${missingDueActions[0].title}"` : 'these items'}?`
        : ''

      const pendingActions = insight.actions.length > 0 ? insight.actions : undefined
      const missingDueActions = (pendingActions || []).filter(
        (action) => (action.type === 'todo' || action.type === 'reminder') && !action.date
      )
      const followUpPrompt = missingDueActions.length > 0
        ? `\n\nQuick question: when should I schedule ${missingDueActions.length === 1 ? `"${missingDueActions[0].title}"` : 'these items'}?`
        : ''

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

      // Auto-append chat to diary only when no actionable items were created
      if (insight.actions.length === 0) {
        await appendToDiaryEntry(new Date(), `### AI Chat\n${trimmedMessage}`)
      }
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
    messagesEndRef,
    speechRecognition,
  }
}
