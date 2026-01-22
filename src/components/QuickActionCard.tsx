import { useState } from 'react'
import { Sparkles, PenTool, CheckCircle2, Send, Loader2, Mic, MicOff, Trash2 } from 'lucide-react'
import { TiptapEditor } from './TiptapEditor'
import { db } from '../lib/db'
import { cn } from '../lib/utils'
import { useAIChat } from '../hooks/useAIChat'
import { marked } from 'marked'

export function QuickActionCard() {
    const [activeTab, setActiveTab] = useState<'ai' | 'diary'>('ai')
    const [diaryContent, setDiaryContent] = useState('')
    const [isSaved, setIsSaved] = useState(false)
    const [editorKey, setEditorKey] = useState(0)

    // AI Chat Hook
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
        messagesEndRef,
    } = useAIChat({
        initialMessages: [
            {
                role: 'assistant',
                content: 'I\'m ready. Tell me what\'s on your mind or what you need to organize.',
            },
        ],
    })

    const handleSaveDiary = async (content: string) => {
        const trimmed = content.replace(/<p><\/p>/g, '').trim()
        if (!trimmed) return

        try {
            await db.entries.add({
                id: crypto.randomUUID(),
                type: 'diary',
                source: 'diary',
                date: new Date(),
                content: content,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: [],
                linkedEntryIds: [],
            })

            setDiaryContent('')
            setEditorKey(prev => prev + 1)
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 3000)
        } catch (error) {
            console.error('Failed to save diary entry:', error)
        }
    }

    const renderMarkdown = (content: string) => {
        const html = marked.parse(content, { async: false }) as string
        return html
    }

    return (
        <div className="mt-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-[40px] overflow-hidden shadow-2xl transition-all ring-1 ring-black/5 dark:ring-white/5">
            {/* Tabs Header */}
            <div className="flex bg-muted/20 p-1.5 gap-1">
                <button
                    onClick={() => setActiveTab('ai')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[24px]",
                        activeTab === 'ai'
                            ? "text-primary bg-background shadow-sm"
                            : "text-muted-foreground hover:bg-muted/30"
                    )}
                >
                    <Sparkles size={14} className={activeTab === 'ai' ? "text-primary" : "text-muted-foreground"} />
                    AI Studio
                </button>
                <button
                    onClick={() => setActiveTab('diary')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[24px]",
                        activeTab === 'diary'
                            ? "text-primary bg-background shadow-sm"
                            : "text-muted-foreground hover:bg-muted/30"
                    )}
                >
                    <PenTool size={14} className={activeTab === 'diary' ? "text-primary" : "text-muted-foreground"} />
                    Quick Diary
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 md:p-8">
                {activeTab === 'ai' ? (
                    <div className="flex flex-col h-[400px]">
                        {/* Mini Chat Feed */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {messages.map((message, index) => (
                                <div key={index} className="space-y-2">
                                    <div className={cn(
                                        "rounded-2xl p-4 text-sm font-medium leading-relaxed",
                                        message.role === 'user'
                                            ? "bg-primary text-primary-foreground ml-8"
                                            : "bg-muted/50 border border-border/50 mr-8 text-foreground/90"
                                    )}>
                                        {message.role === 'assistant' ? (
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1"
                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                            />
                                        ) : (
                                            <p>{message.content}</p>
                                        )}
                                    </div>

                                    {/* Actions In-place */}
                                    {message.pendingActions && message.pendingActions.length > 0 && (
                                        <div className="space-y-2 mr-8">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                    Review required
                                                </span>
                                                {message.pendingActions.filter((_, i) => !message.rejectedActionIndices?.includes(i)).length > 1 && (
                                                    <button
                                                        onClick={() => handleAcceptAll(index)}
                                                        className="text-[9px] px-2 py-1 font-black bg-emerald-500/10 text-emerald-600 rounded-lg uppercase tracking-widest hover:bg-emerald-500/20"
                                                    >
                                                        Accept All
                                                    </button>
                                                )}
                                            </div>
                                            {message.pendingActions.map((action, actionIdx) => (
                                                <div key={actionIdx} className="bg-background/80 border border-border/50 rounded-2xl p-4 shadow-sm">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest leading-none">
                                                            {action.type}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleAcceptAction(index, actionIdx, action)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 rounded-lg transition-colors">
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleRejectAction(index, actionIdx)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-sm text-foreground">{action.title}</div>
                                                    {action.content && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.content}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="bg-muted/50 border border-border/50 rounded-2xl p-4 mr-8 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            )}
                            {actionsCreated > 0 && (
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">
                                    <CheckCircle2 size={12} />
                                    {actionsCreated} item{actionsCreated > 1 ? 's' : ''} pushed to system
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="flex gap-2 bg-background/50 p-2 rounded-[28px] border border-border/50 shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <button
                                onClick={handleVoiceToggle}
                                className={cn(
                                    "p-3 rounded-2xl transition-all",
                                    isListening ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask AI anything..."
                                className="flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 outline-none px-2"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Expressive Diary</h3>
                                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Logged to today's journal</p>
                            </div>
                            {isSaved && (
                                <div className="flex items-center gap-2 text-emerald-500 animate-in fade-in slide-in-from-right-2">
                                    <CheckCircle2 size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Thought Captured</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-background/50 border border-border/30 rounded-[32px] p-6 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner min-h-[160px] flex flex-col">
                            <TiptapEditor
                                key={editorKey}
                                content={diaryContent}
                                onChange={setDiaryContent}
                                onEnter={handleSaveDiary}
                                placeholder="Unfiltered thoughts... (Press Enter to log forever)"
                            />
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Real-time Sync Active</span>
                            </div>
                            <button
                                onClick={() => handleSaveDiary(diaryContent)}
                                className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary/20 transition-all"
                            >
                                Log Entry
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
