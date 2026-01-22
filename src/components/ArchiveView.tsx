import { useLiveQuery } from 'dexie-react-hooks'
import { useState, useMemo, useEffect } from 'react'
import {
    Search,
    Archive,
    Clock,
    Tag as TagIcon,
    Filter,
    History,
    Sparkles,
    MessageSquare,
    CheckCircle2,
    StickyNote,
    Inbox,
    Loader2,
    ArchiveRestore
} from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, cn, ensureString } from '../lib/utils'
import { TagCloud, getTagColor } from './TagCloud'
import { semanticSearch, type SearchResult } from '../services/semanticSearchService'

export function ArchiveView() {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<string>('all')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isAISearching, setIsAISearching] = useState(false)
    const [aiResults, setAiResults] = useState<SearchResult[] | null>(null)

    // Fetch all entries for the archive
    const allEntries = useLiveQuery(() => db.entries.toArray()) || []

    // Filter archived entries
    const archivedEntries = useMemo(() => {
        // If we have AI results, use them
        if (aiResults) {
            return aiResults.map(r => r.entry)
        }

        let filtered = [...allEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // In Archive view, we show EVERYTHING by default but tagged as archived
        // If user wants to filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(e => e.type === filterType)
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
            filtered = filtered.filter(e =>
                selectedTags.every(tag => (e.tags || []).includes(tag))
            )
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(e =>
                e.content.toLowerCase().includes(q) ||
                (e.title && e.title.toLowerCase().includes(q)) ||
                (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
            )
        }

        return filtered
    }, [allEntries, filterType, searchQuery, aiResults, selectedTags])

    // PKM Feature: "On This Day"
    const onThisDay = useMemo(() => {
        const now = new Date()
        return allEntries.filter(e => {
            const d = new Date(e.date)
            return d.getMonth() === now.getMonth() &&
                d.getDate() === now.getDate() &&
                d.getFullYear() < now.getFullYear()
        })
    }, [allEntries])

    const handleToggleArchive = async (id: string, currentStatus?: boolean) => {
        await db.entries.update(id, { archived: !currentStatus })
    }

    const handleAISearch = async () => {
        if (!searchQuery.trim()) {
            setAiResults(null)
            return
        }
        setIsAISearching(true)
        try {
            const results = await semanticSearch(searchQuery)
            setAiResults(results)
        } catch (err) {
            console.error(err)
        } finally {
            setIsAISearching(false)
        }
    }

    // Clear AI results when typing or changing filter
    useEffect(() => {
        if (aiResults) setAiResults(null)
    }, [filterType, selectedTags])

    return (
        <div className="container mx-auto px-4 max-w-6xl py-8 pb-32">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Archive & Memory</h1>
                <p className="text-muted-foreground mt-1">Search and manage your entire knowledge base.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                            <Filter size={14} /> Filter By Type
                        </h3>
                        <div className="space-y-1">
                            {['all', 'diary', 'todo', 'voice', 'reminder'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-all",
                                        filterType === type ? "bg-primary text-primary-foreground font-medium shadow-sm" : "hover:bg-background/50"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <TagCloud
                        selectedTags={selectedTags}
                        onTagClick={(tag) => setSelectedTags(prev =>
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        )}
                        onClearTags={() => setSelectedTags([])}
                    />

                    {onThisDay.length > 0 && (
                        <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
                                <History size={14} /> On This Day
                            </h3>
                            <div className="space-y-3">
                                {onThisDay.slice(0, 3).map(entry => (
                                    <div key={entry.id} className="text-sm border-l-2 border-orange-500/30 pl-3 py-1">
                                        <p className="line-clamp-2 text-foreground/80">{ensureString(entry.title || entry.content)}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(entry.date).getFullYear()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Search Box */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search everything (notes, tasks, voice)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                            className="w-full bg-background border-border border-2 rounded-2xl py-4 pl-12 pr-28 sm:pr-32 focus:outline-none focus:border-primary/50 transition-all text-sm sm:text-lg shadow-sm"
                        />
                        <button
                            onClick={handleAISearch}
                            disabled={isAISearching}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-2"
                        >
                            {isAISearching ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                            <span className="hidden sm:inline">AI Search</span>
                            <span className="sm:hidden">AI</span>
                        </button>
                    </div>

                    {/* Results */}
                    <div className="space-y-4">
                        {archivedEntries.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl opacity-50">
                                <Inbox size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                                <p>No matches found in your archive.</p>
                            </div>
                        ) : (
                            archivedEntries.map(entry => (
                                <div key={entry.id} className="group bg-card border border-border/50 hover:border-primary/30 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md relative">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 flex-shrink-0">
                                            {entry.type === 'voice' && <MessageSquare size={18} className="text-blue-500" />}
                                            {entry.type === 'todo' && <CheckCircle2 size={18} className="text-green-500" />}
                                            {entry.type === 'reminder' && <Clock size={18} className="text-purple-500" />}
                                            {entry.type === 'diary' && <StickyNote size={18} className="text-orange-500" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    {formatDate(entry.date)} • {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleToggleArchive(entry.id, entry.archived)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider",
                                                            entry.archived
                                                                ? "bg-primary text-primary-foreground shadow-md hover:scale-105"
                                                                : "bg-secondary text-muted-foreground hover:bg-muted"
                                                        )}
                                                        title={entry.archived ? "Unarchive" : "Archive"}
                                                    >
                                                        {entry.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                                        {entry.archived ? "Unarchive" : "Archive"}
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="text-lg font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                                                {ensureString(entry.title || entry.content)}
                                            </h4>
                                            {entry.title && entry.content && entry.title !== entry.content && (
                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                                    {ensureString(entry.content)}
                                                </p>
                                            )}

                                            {entry.tags && entry.tags.length > 0 && (
                                                <div className="flex gap-2 mt-3 flex-wrap">
                                                    {entry.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className={cn(
                                                                "flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border shadow-sm font-medium transition-all hover:scale-105",
                                                                getTagColor(tag)
                                                            )}
                                                        >
                                                            <TagIcon size={8} className="opacity-60" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
