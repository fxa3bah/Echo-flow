import { useEffect, useRef } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, Mic, MicOff, Inbox } from 'lucide-react'
import { marked } from 'marked'
import { cn } from '../lib/utils'
import { useAIChat } from '../hooks/useAIChat'
import { AIActionCard } from './AIActionCard'

export function AIInsights() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const {
    messages, input, setInput, isLoading, actionsCreated, isListening,
    handleVoiceToggle, handleSend, handleAcceptAction, handleRejectAction,
    handleAcceptAll, handleSendMessage, handleClearChat,
    messagesEndRef,
  } = useAIChat({
    initialMessages: [
      {
        role: 'assistant',
        content: '### ☀️ Welcome to Chronicle\nI can help you capture thoughts or summarize your agenda. Just speak naturally!',
      },
    ],
  })

  useEffect(() => { inputRef.current?.focus() }, [])

  const quickPrompts = [
    'How does my day look?',
    'Any overdue tasks?',
    'What is due tomorrow?',
  ]

  const renderMarkdown = (content: string) => {
    return marked.parse(content, {
      async: false,
      breaks: true,
      gfm: true
    }) as string
  }

  return (
    <div className="flex flex-col flex-1 max-w-4xl mx-auto p-4 sm:p-6 pb-24 md:pb-6 min-h-0 bg-background/50">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-2xl">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">AI Assistant</h2>
        </div>
        <button
          onClick={handleClearChat}
          className="text-[10px] font-medium uppercase tracking-widest px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-all"
        >
          Reset Session
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-6 mb-8 px-2 custom-scrollbar">
        {messages.map((message, index) => (
          <div key={index} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div
              className={cn(
                'group relative max-w-[85%] rounded-[28px] p-5 text-sm transition-all',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto shadow-lg shadow-primary/20 rounded-br-lg'
                  : 'bg-transparent border-none shadow-none rounded-bl-lg'
              )}
            >
              <div
                className={cn(
                  "prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ul:list-none prose-ul:pl-0 prose-li:my-0 prose-headings:font-semibold prose-hr:my-2 leading-relaxed",
                  message.role === 'user' && "text-primary-foreground prose-invert"
                )}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            </div>

            {/* Confirmation Area for Actions */}
            {message.pendingActions && message.pendingActions.length > 0 && (
              <div className="space-y-4 mr-[15%]">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
                    <Inbox size={12} />
                    Action Staging ({message.pendingActions.length})
                  </div>
                  {message.pendingActions.length > 1 && (
                    <button
                      onClick={() => handleAcceptAll(index)}
                      className="text-[10px] font-medium uppercase tracking-widest text-primary hover:underline transition-all"
                    >
                      Confirm All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {message.pendingActions.map((action, actionIdx) => (
                    <AIActionCard
                      key={actionIdx}
                      action={action}
                      onAccept={(edited) => handleAcceptAction(index, actionIdx, edited)}
                      onReject={() => handleRejectAction(index, actionIdx)}
                      isRejected={message.rejectedActionIndices?.includes(actionIdx)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 animate-pulse ml-2 pb-8">
            <div className="bg-card border border-border/40 rounded-2xl p-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40">Synthesizing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Interaction Area */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 px-2">
          {quickPrompts.map(p => (
            <button
              key={p}
              onClick={() => handleSendMessage(p)}
              className="text-[10px] font-medium uppercase tracking-tight px-4 py-2 bg-muted/30 border border-border/10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative group">
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
            placeholder="Type a memory or command..."
            className="w-full min-h-[100px] p-6 pr-24 border border-border/40 rounded-[32px] bg-card/40 backdrop-blur-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xl transition-all group-focus-within:-translate-y-1"
            rows={2}
            disabled={isLoading}
          />
          <div className="absolute right-4 bottom-4 flex items-center gap-3">
            <button
              onClick={handleVoiceToggle}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-2xl transition-all active:scale-90',
                isListening ? 'bg-destructive text-white' : 'bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-white'
              )}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-4 rounded-2xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>

        {actionsCreated > 0 && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-in slide-in-from-bottom duration-300">
            <CheckCircle2 size={12} />
            {actionsCreated} Traces committed to Chronicle
          </div>
        )}
      </div>
    </div>
  )
}
