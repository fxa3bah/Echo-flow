import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

export interface SlashCommand {
  label: string
  value: string | (() => string)
  category: string
  description?: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  // Basic
  { label: 'Page reference', value: '[[]]', category: 'BASIC', description: 'Link to another page' },
  { label: 'Block reference', value: '((', category: 'BASIC', description: 'Reference a block' },
  { label: 'Link', value: '[]()', category: 'BASIC', description: 'Insert a link' },
  { label: 'Image', value: '![]()', category: 'BASIC', description: 'Insert an image' },
  { label: 'Bold', value: '****', category: 'BASIC', description: 'Make text bold' },
  { label: 'Italic', value: '**', category: 'BASIC', description: 'Make text italic' },
  { label: 'Strikethrough', value: '~~~~', category: 'BASIC', description: 'Strike through text' },
  { label: 'Highlight', value: '====', category: 'BASIC', description: 'Highlight text' },
  { label: 'Code', value: '``', category: 'BASIC', description: 'Inline code' },
  { label: 'Code block', value: '```\n\n```', category: 'BASIC', description: 'Multi-line code' },

  // Headings
  { label: 'Heading 1', value: '# ', category: 'HEADING', description: 'Large heading' },
  { label: 'Heading 2', value: '## ', category: 'HEADING', description: 'Medium heading' },
  { label: 'Heading 3', value: '### ', category: 'HEADING', description: 'Small heading' },
  { label: 'Heading 4', value: '#### ', category: 'HEADING', description: 'Tiny heading' },
  { label: 'Heading 5', value: '##### ', category: 'HEADING', description: 'Smallest heading' },
  { label: 'Heading 6', value: '###### ', category: 'HEADING', description: 'Minimal heading' },

  // Time & Date
  { label: 'Today', value: () => new Date().toLocaleDateString(), category: 'TIME & DATE', description: 'Insert today\'s date' },
  { label: 'Tomorrow', value: () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString()
  }, category: 'TIME & DATE', description: 'Insert tomorrow\'s date' },
  { label: 'Yesterday', value: () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toLocaleDateString()
  }, category: 'TIME & DATE', description: 'Insert yesterday\'s date' },
  { label: 'Current time', value: () => new Date().toLocaleTimeString(), category: 'TIME & DATE', description: 'Insert current time' },
  { label: 'Date & Time', value: () => new Date().toLocaleString(), category: 'TIME & DATE', description: 'Insert date and time' },

  // List Types
  { label: 'Bullet list', value: '- ', category: 'LIST', description: 'Unordered list' },
  { label: 'Numbered list', value: '1. ', category: 'LIST', description: 'Ordered list' },
  { label: 'TODO', value: '- [ ] ', category: 'TASK', description: 'Todo checkbox' },
  { label: 'DOING', value: '- [>] ', category: 'TASK', description: 'In progress task' },
  { label: 'DONE', value: '- [x] ', category: 'TASK', description: 'Completed task' },
  { label: 'WAITING', value: '- [?] ', category: 'TASK', description: 'Waiting task' },
  { label: 'CANCELED', value: '- [-] ', category: 'TASK', description: 'Canceled task' },

  // Priority
  { label: 'Priority A', value: '[#A] ', category: 'PRIORITY', description: 'Highest priority' },
  { label: 'Priority B', value: '[#B] ', category: 'PRIORITY', description: 'Medium priority' },
  { label: 'Priority C', value: '[#C] ', category: 'PRIORITY', description: 'Low priority' },

  // Misc
  { label: 'Quote', value: '> ', category: 'MISC', description: 'Blockquote' },
  { label: 'Divider', value: '\n---\n', category: 'MISC', description: 'Horizontal rule' },
  { label: 'Table', value: '\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', category: 'MISC', description: 'Insert table' },
]

interface SlashCommandMenuProps {
  filter: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  position: { top: number; left: number }
}

export function SlashCommandMenu({ filter, onSelect, onClose, position }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Filter commands based on search text
  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.category.toLowerCase().includes(filter.toLowerCase())
  )

  // Group commands by category
  const groupedCommands: Record<string, SlashCommand[]> = {}
  filteredCommands.forEach(cmd => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = []
    }
    groupedCommands[cmd.category].push(cmd)
  })

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector('[data-selected="true"]')
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute z-50 w-80 bg-popover border border-border rounded-lg shadow-lg p-3"
        style={{ top: position.top, left: position.left }}
      >
        <p className="text-sm text-muted-foreground">No commands found</p>
      </div>
    )
  }

  let currentIndex = 0

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-80 max-h-96 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {Object.entries(groupedCommands).map(([category, commands]) => (
        <div key={category} className="py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {category}
          </div>
          {commands.map((command) => {
            const itemIndex = currentIndex++
            const isSelected = itemIndex === selectedIndex

            return (
              <button
                key={command.label}
                data-selected={isSelected}
                onClick={() => onSelect(command)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent',
                  isSelected && 'bg-accent'
                )}
              >
                <div className="font-medium">{command.label}</div>
                {command.description && (
                  <div className="text-xs text-muted-foreground">{command.description}</div>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
