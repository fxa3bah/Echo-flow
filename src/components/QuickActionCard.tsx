import { useState } from 'react'
import { Sparkles, PenTool, CheckCircle2, Send, Mic, MicOff, Trash2 } from 'lucide-react'
import { TiptapEditor } from './TiptapEditor'
import { db } from '../lib/db'
import { cn, stripHtml } from '../lib/utils'
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
        <div className="mt-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl sm:rounded-[40px] overflow-hidden shadow-2xl transition-all ring-1 ring-black/5 dark:ring-white/5">
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
                <div className="h-[400px] sm:h-[480px]">
                    {activeTab === 'ai' ? (
                        <div className="flex flex-col h-full animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">AI Studio</h3>
                                    <p className="text-[10px] sm:text-xs font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-1">Intelligent thought processor</p>
                                </div>
                                <div className="flex items-center gap-2 text-primary/60 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Live Engine</span>
                                </div>
                            </div>

                            {/* Mini Chat Feed */}
                            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-none">
                                {messages.map((message, index) => (
                                    <div key={index} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className={cn(
                                            "rounded-[24px] p-5 text-sm font-medium leading-[1.6]",
                                            message.role === 'user'
                                                ? "bg-primary text-primary-foreground ml-12 shadow-lg shadow-primary/10"
                                                : "bg-muted/30 border border-border/40 mr-12 text-foreground/80 backdrop-blur-sm"
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
                                            <div className="space-y-3 mr-12">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40"> Review Actions </span>
                                                    {message.pendingActions.filter((_, i) => !message.rejectedActionIndices?.includes(i)).length > 1 && (
                                                        <button
                                                            onClick={() => handleAcceptAll(index)}
                                                            className="text-[9px] px-3 py-1 font-black bg-emerald-500 text-white rounded-full uppercase tracking-widest hover:brightness-110 shadow-lg shadow-emerald-500/20"
                                                        >
                                                            Commit All
                                                        </button>
                                                    )}
                                                </div>
                                                {message.pendingActions.map((action, actionIdx) => (
                                                    <div key={actionIdx} className="bg-background/40 backdrop-blur-md border border-border/50 rounded-[28px] p-5 shadow-sm transition-all hover:border-primary/30">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest leading-none border border-primary/20">
                                                                {action.type}
                                                            </span>
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => handleAcceptAction(index, actionIdx, action)} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-full transition-all active:scale-90">
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                                <button onClick={() => handleRejectAction(index, actionIdx)} className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-all active:scale-90">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="font-black text-sm text-foreground tracking-tight">{stripHtml(action.title)}</div>
                                                        {action.content && <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{stripHtml(action.content)}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="bg-muted/20 border border-border/20 rounded-[24px] p-5 mr-12 animate-pulse flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce shadow-primary/50" />
                                        <span className="text-xs font-black text-primary/40 uppercase tracking-widest">Analyzing</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* AI Input Area */}
                            <div className="mt-auto pt-6 border-t border-border/10 space-y-4">
                                <div className="flex items-center gap-3 px-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase">Intelligence Connection Active</span>
                                </div>
                                <div className="flex gap-2 bg-background/50 p-2.5 rounded-[32px] border border-border/50 shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all backdrop-blur-sm group">
                                    <button
                                        onClick={handleVoiceToggle}
                                        className={cn(
                                            "p-3.5 rounded-2xl transition-all shadow-sm",
                                            isListening ? "bg-destructive text-destructive-foreground shadow-destructive/20 scale-105" : "text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Command your digital shadow..."
                                        className="flex-1 bg-transparent border-none text-base font-bold focus:ring-0 outline-none px-3 text-foreground"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading}
                                        className="p-3.5 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Expressive Diary</h3>
                                    <p className="text-[10px] sm:text-xs font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-1 space-x-1">
                                        <span>Logged to today's journal</span>
                                    </p>
                                </div>
                                {isSaved && (
                                    <div className="flex items-center gap-2 text-emerald-500 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 shadow-sm">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Memory Saved</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 bg-background/50 border border-border/30 rounded-[40px] p-8 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner flex flex-col group/editor">
                                <div className="flex-1 min-h-[120px]">
                                    <TiptapEditor
                                        key={editorKey}
                                        content={diaryContent}
                                        onChange={setDiaryContent}
                                        onEnter={handleSaveDiary}
                                        placeholder="Unfiltered thoughts... (Press Enter to log)"
                                    />
                                </div>

                                <div className="mt-8 flex items-center justify-between pt-6 border-t border-border/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase">Intelligence Sync Active</span>
                                    </div>
                                    <button
                                        onClick={() => handleSaveDiary(diaryContent)}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Log Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
