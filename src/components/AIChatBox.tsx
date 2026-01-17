import { useRef } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, Mic, MicOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAIChat } from '../hooks/useAIChat'
import { AIActionCard } from './AIActionCard'

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
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAll,
    handleUpdatePendingAction,
    handleSendMessage,
    handleClearChat,
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

  const quickDueOptions = [
    {
      label: 'In 2 hours',
      getDate: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      label: 'Tomorrow 9am',
      getDate: () => {
        const date = new Date()
        date.setDate(date.getDate() + 1)
        date.setHours(9, 0, 0, 0)
        return date
      },
    },
    {
      label: 'Next week',
      getDate: () => {
        const date = new Date()
        date.setDate(date.getDate() + 7)
        date.setHours(9, 0, 0, 0)
        return date
      },
    },
  ]

  return (
    <div className="mt-8 border border-border rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Chat</h3>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Clear chat
        </button>
        {actionsCreated > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionsCreated} update{actionsCreated > 1 ? 's' : ''} saved</span>
          </div>
        )}
      </div>

      <div className="bg-muted/30 rounded-lg p-3 max-h-96 overflow-y-auto space-y-3">
        <div className="flex flex-wrap gap-2">
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
        {messages.map((message, messageIndex) => (
          <div key={messageIndex} className="space-y-2">
            <div
              className={cn(
                'rounded-lg p-2 text-sm',
                message.role === 'user' ? 'bg-primary text-primary-foreground ml-6' : 'bg-card border border-border mr-6'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Pending Actions - Show action cards for user to confirm */}
            {message.pendingActions && message.pendingActions.length > 0 && (
              <div className="space-y-2 mr-6">
                {message.pendingActions.some(
                  (action, index) =>
                    !message.rejectedActionIndices?.includes(index) &&
                    (action.type === 'todo' || action.type === 'reminder') &&
                    !action.date
                ) && (
                  <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground space-y-2">
                    <div className="font-medium text-foreground">Set due dates fast</div>
                    <div className="space-y-2">
                      {message.pendingActions.map((action, actionIndex) => {
                        if (
                          message.rejectedActionIndices?.includes(actionIndex) ||
                          (action.type !== 'todo' && action.type !== 'reminder') ||
                          action.date
                        ) {
                          return null
                        }

                        return (
                          <div key={`${action.title}-${actionIndex}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground">"{action.title}"</span>
                            {quickDueOptions.map((option) => (
                              <button
                                key={option.label}
                                onClick={() =>
                                  handleUpdatePendingAction(messageIndex, actionIndex, { date: option.getDate() })
                                }
                                className="px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.pendingActions.filter((_, i) => !message.rejectedActionIndices?.includes(i)).length} action(s) to review
                  </span>
                  {message.pendingActions.filter((_, i) => !message.rejectedActionIndices?.includes(i)).length > 1 && (
                    <button
                      onClick={() => handleAcceptAll(messageIndex)}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Accept All
                    </button>
                  )}
                </div>
                {message.pendingActions.map((action, actionIndex) => (
                  <AIActionCard
                    key={actionIndex}
                    action={action}
                    onAccept={(editedAction) => handleAcceptAction(messageIndex, actionIndex, editedAction)}
                    onReject={() => handleRejectAction(messageIndex, actionIndex)}
                    isRejected={message.rejectedActionIndices?.includes(actionIndex)}
                  />
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
