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

export function useAIChat({ initialMessages = [] }: { initialMessages?: AIChatMessage[] } = {}) {
  const [messages, setMessages] = useState<AIChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionsCreated, setActionsCreated] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const storageKeyRef = useRef('echo-flow-ai-chat-v2')

  const speechRecognition = useSpeechRecognition()

  useEffect(() => {
    if (speechRecognition.transcript) setInput(speechRecognition.transcript)
  }, [speechRecognition.transcript])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(storageKeyRef.current)
    if (stored) setMessages(JSON.parse(stored))
  }, [])

  // Save to local storage
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

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return
    const trimmed = userMessage.trim()

    setInput('')
    speechRecognition.resetTranscript()
    setIsListening(false)
    speechRecognition.stopListening()

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setIsLoading(true)

    try {
      const history: ChatMessage[] = messages.slice(-5).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      const context = await buildAIContextSummary()
      const insight = await getAIInsights(trimmed, history, context)

      // The AI already provides priority and tags now. We just ensure they exist.
      const normalizedActions = (insight.actions || []).map(a => ({
        ...a,
        priority: a.priority || 'not-urgent-important',
        tags: a.tags && a.tags.length > 0 ? a.tags : ['ai-captured']
      }))

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: insight.response,
        pendingActions: normalizedActions.length > 0 ? normalizedActions : undefined,
        rejectedActionIndices: []
      }])

    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Check your API configuration.`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => sendMessage(input)
  const handleSendMessage = (msg: string) => sendMessage(msg)
  const handleClearChat = () => {
    setMessages([])
    window.localStorage.removeItem(storageKeyRef.current)
  }

  const handleAcceptAction = async (msgIdx: number, actionIdx: number, action: AIAction) => {
    const result = await applyAIActions([action])
    if (result.created > 0) {
      setActionsCreated(prev => prev + 1)
      setTimeout(() => setActionsCreated(0), 2000)
    }
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIdx && m.pendingActions) {
        const remaining = m.pendingActions.filter((_, ai) => ai !== actionIdx)
        return { ...m, pendingActions: remaining.length > 0 ? remaining : undefined }
      }
      return m
    }))
  }

  const handleRejectAction = (msgIdx: number, actionIdx: number) => {
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIdx) return { ...m, rejectedActionIndices: [...(m.rejectedActionIndices || []), actionIdx] }
      return m
    }))
  }

  const handleAcceptAll = async (msgIdx: number) => {
    const msg = messages[msgIdx]
    if (!msg?.pendingActions) return
    const result = await applyAIActions(msg.pendingActions)
    setActionsCreated(result.created + result.updated)
    setTimeout(() => setActionsCreated(0), 2000)
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, pendingActions: undefined } : m))
  }

  const handleUpdatePendingAction = (msgIdx: number, actionIdx: number, updates: Partial<AIAction>) => {
    setMessages(prev => prev.map((m, i) => {
      if (i === msgIdx && m.pendingActions) {
        const next = m.pendingActions.map((a, ai) => ai === actionIdx ? { ...a, ...updates } : a)
        return { ...m, pendingActions: next }
      }
      return m
    }))
  }

  return {
    messages, input, setInput, isLoading, actionsCreated, isListening,
    handleVoiceToggle, handleSend, handleAcceptAction, handleRejectAction,
    handleAcceptAll, handleUpdatePendingAction, handleSendMessage, handleClearChat,
    messagesEndRef, speechRecognition
  }
}
