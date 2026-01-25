import { useState } from 'react'
import { Check, X, Edit3, Calendar, Hash, CheckSquare, Clock, FileText, BookOpen, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import type { AIAction } from '../services/aiActions'

interface AIActionCardProps {
  action: AIAction
  onAccept: (action: AIAction) => void
  onReject: () => void
  isRejected?: boolean
}

const icons = { todo: CheckSquare, reminder: Clock, note: FileText, journal: BookOpen }

export function AIActionCard({ action, onAccept, onReject, isRejected }: AIActionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [edit, setEdit] = useState(action)

  const Icon = icons[action.type] || AlertCircle

  if (isRejected) {
    return (
      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 opacity-40">
        <div className="flex items-center gap-3">
          <Icon size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium line-through">{action.title}</span>
          <span className="ml-auto text-[10px] font-black uppercase text-destructive tracking-widest">Discarded</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[24px] p-5 shadow-sm transition-all hover:shadow-md ring-1 ring-black/5 dark:ring-white/5">
      {isEditing ? (
        <div className="space-y-4">
          <input
            value={edit.title}
            onChange={e => setEdit({ ...edit, title: e.target.value })}
            className="w-full bg-background/50 border-none rounded-xl px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary"
            placeholder="Title"
          />
          <textarea
            value={edit.content}
            onChange={e => setEdit({ ...edit, content: e.target.value })}
            className="w-full bg-background/50 border-none rounded-xl px-3 py-2 text-xs h-20 resize-none focus:ring-1 focus:ring-primary"
            placeholder="Details..."
          />
          <div className="flex gap-2">
            <button onClick={() => onAccept(edit)} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Update & Accept</button>
            <button onClick={() => setIsEditing(false)} className="px-4 bg-muted py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-2.5 rounded-2xl bg-primary/5 text-primary shadow-inner",
              action.priority === 'urgent-important' && "bg-destructive/5 text-destructive"
            )}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black tracking-tight leading-none mb-1">
                {action.title || "Capture Entry"}
              </div>
              {action.content && (
                <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-snug">
                  {action.content}
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-3">
                {action.date && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-primary/60 uppercase tracking-tighter">
                    <Calendar size={12} />
                    {new Date(action.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {action.tags?.map(t => (
                  <div key={t} className="flex items-center gap-1 text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                    <Hash size={10} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-border/10">
            <button
              onClick={() => onAccept(action)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              <Check size={14} />
              Confirm
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all"
              title="Edit"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={onReject}
              className="p-2.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
              title="Discard"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
