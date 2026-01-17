import { useRef } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, Mic, MicOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAIChat } from '../hooks/useAIChat'

export function AIChatBox() {
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
    messagesEndRef,
    speechRecognition,
  } = useAIChat({
    initialMessages: [
      {
        role: 'assistant',
        content: 'Ask me anything or describe what you need. I\'ll help capture it in Daily Notes.',
      },
    ],
  })

  return (
    <div className="mt-8 border border-border rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Chat</h3>
        </div>
        {actionsCreated > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionsCreated} update{actionsCreated > 1 ? 's' : ''} saved</span>
          </div>
        )}
      </div>

      <div className="bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'rounded-lg p-2 text-sm',
              message.role === 'user' ? 'bg-primary text-primary-foreground ml-6' : 'bg-card border border-border mr-6'
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.actions && message.actions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                {message.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Added {action.type}: {action.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 space-y-2">
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
            placeholder="Chat with AI to capture notes, tasks, or reminders..."
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
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
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
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Messages sync to Daily Notes and tasks automatically.
        </p>
      </div>
    </div>
  )
}
