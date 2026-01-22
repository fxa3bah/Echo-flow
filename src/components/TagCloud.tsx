import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { cn } from '../lib/utils'
import { Filter } from 'lucide-react'
import { useMemo } from 'react'

interface TagCloudProps {
    selectedTags: string[]
    onTagClick: (tag: string) => void
    onClearTags: () => void
    maxTags?: number
}

// Gmail-style color hashing
export const getTagColor = (tag: string) => {
    const colors = [
        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50',
        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
        'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50',
        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50',
        'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50',
        'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50',
        'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50',
        'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50',
        'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800/50',
        'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50',
    ]

    let hash = 0
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
}

export function TagCloud({ selectedTags, onTagClick, onClearTags, maxTags = 20 }: TagCloudProps) {
    const allEntries = useLiveQuery(() => db.entries.toArray()) || []

    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        allEntries.forEach(entry => {
            (entry.tags || []).forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1
            })
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTags)
    }, [allEntries, maxTags])

    if (tagCounts.length === 0) return null

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                    <Filter size={12} className="text-primary" /> Smart Tags
                </h3>
                {selectedTags.length > 0 && (
                    <button
                        onClick={onClearTags}
                        className="text-[10px] text-primary hover:text-primary/80 font-black uppercase tracking-widest transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {tagCounts.map(([tag, count]) => {
                    const isSelected = selectedTags.includes(tag)
                    return (
                        <button
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 group",
                                isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105"
                                    : cn(getTagColor(tag), "border-transparent hover:border-current hover:bg-opacity-20 shadow-sm")
                            )}
                        >
                            <span>{tag}</span>
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-lg transition-colors",
                                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-black/5 dark:bg-white/10 text-muted-foreground group-hover:text-current"
                            )}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
