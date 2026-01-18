import { Home, Database, Calendar, Target, BookOpen, Moon, Sun, Settings, Sparkles } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { cn } from '../lib/utils'

type View = 'home' | 'aiinsights' | 'entries' | 'calendar' | 'focus' | 'diary'

interface NavigationProps {
  currentView: View
  onViewChange: (view: View) => void
  onOpenSettings: () => void
}

export function Navigation({ currentView, onViewChange, onOpenSettings }: NavigationProps) {
  const { setTheme, actualTheme } = useThemeStore()

  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark')
  }

  const navItems = [
    { id: 'home' as View, icon: Home, label: 'Record' },
    { id: 'focus' as View, icon: Target, label: 'Focus' },
    { id: 'aiinsights' as View, icon: Sparkles, label: 'AI Chat' },
    { id: 'calendar' as View, icon: Calendar, label: 'Calendar' },
    { id: 'diary' as View, icon: BookOpen, label: 'Diary' },
    { id: 'entries' as View, icon: Database, label: 'All' },
  ]

  return (
    <nav className="flex items-center gap-1 md:gap-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={cn(
            'flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-lg transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'min-h-[44px] min-w-[44px]', // Minimum touch target size
            currentView === item.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground'
          )}
          aria-label={item.label}
          title={item.label}
        >
          <item.icon size={20} />
          <span className="hidden md:inline text-sm font-medium">
            {item.label}
          </span>
        </button>
      ))}

      <button
        onClick={toggleTheme}
        className="ml-1 md:ml-2 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <button
        onClick={onOpenSettings}
        className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Settings"
        title="Settings (Ctrl+,)"
      >
        <Settings size={20} />
      </button>
    </nav>
  )
}
