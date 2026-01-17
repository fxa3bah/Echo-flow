import { useEffect, useRef, useState } from 'react'
import { getAIInsights, type ChatMessage } from '../services/groqChatService'
import { useSpeechRecognition } from './useSpeechRecognition'
import { applyAIActions, appendToDiaryEntry, buildAIContextSummary } from '../services/aiActions'

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: any[]
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    speechRecognition.resetTranscript()
    setIsListening(false)
    speechRecognition.stopListening()

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const conversationHistory: ChatMessage[] = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const contextSummary = await buildAIContextSummary()
      const insight = await getAIInsights(userMessage, conversationHistory, contextSummary)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: insight.response,
          actions: insight.actions,
        },
      ])

      const noteActionExists = insight.actions.some(
        (action) => action.type === 'note' || action.type === 'journal'
      )

      const actionResult = await applyAIActions(insight.actions, new Date())

      const appendedFromChat = !noteActionExists
        ? await appendToDiaryEntry(new Date(), `### AI Chat\n${userMessage}`)
        : false

      const createdCount = actionResult.created +
        actionResult.updated +
        (actionResult.diaryUpdated ? 1 : 0) +
        (appendedFromChat ? 1 : 0)

      if (createdCount > 0) {
        setActionsCreated(createdCount)
        setTimeout(() => setActionsCreated(0), 3000)
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

  return {
    messages,
    input,
    setInput,
    isLoading,
    actionsCreated,
    isListening,
    handleVoiceToggle,
    handleSend,
    messagesEndRef,
    speechRecognition,
  }
}
