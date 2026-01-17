import { useEffect, useRef } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, Mic, MicOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAIChat } from '../hooks/useAIChat'

export function AIInsights() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const {
    messages,
    input,
    setInput,
    isLoading,
    actionsCreated,
    isListening,
    handleVoiceToggle,
    handleSend,
    handleSendMessage,
    handleClearChat,
    messagesEndRef,
    speechRecognition,
  } = useAIChat({
    initialMessages: [
      {
        role: 'assistant',
        content: 'Hi! I\'m your AI assistant. Tell me what you need to do, and I\'ll help organize it for you. Just talk naturally! 😊',
      },
    ],
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const quickPrompts = [
    'How does my day look?',
    'What are my top priorities today?',
    'Summarize what is due today.',
    'Show me urgent items I should do first.',
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
    handleSendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">AI Insights</h2>
          </div>
          <button
            onClick={handleClearChat}
            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Clear chat
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat naturally with AI. It will automatically create todos, reminders, and notes for you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
        {actionsCreated > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionsCreated} item{actionsCreated > 1 ? 's' : ''} created!</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/30 rounded-lg">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[70%] rounded-lg p-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border space-y-1">
                  {message.actions.map((action, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Created {action.type}: {action.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium">You</span>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="space-y-2">
        {speechRecognition.error && (
          <div className="text-sm text-destructive">{speechRecognition.error}</div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type or speak your message... (Shift+Enter for new line)"
            className="flex-1 p-3 border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={cn(
                'p-3 rounded-lg transition-colors',
                isListening
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Press Enter to send • Shift+Enter for new line • Click mic to speak
        </p>
      </div>
    </div>
  )
}
