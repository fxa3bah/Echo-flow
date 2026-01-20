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
    <nav className="flex items-center justify-center gap-0.5 sm:gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={cn(
            'flex items-center justify-center gap-1.5 px-2 py-2 sm:px-2.5 sm:py-2 rounded-lg transition-all',
            'hover:bg-accent hover:text-accent-foreground',
            'min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px]',
            currentView === item.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground'
          )}
          aria-label={item.label}
          title={item.label}
        >
          <item.icon size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden lg:inline text-xs font-medium">
            {item.label}
          </span>
        </button>
      ))}

      <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

      <button
        onClick={toggleTheme}
        className="flex items-center justify-center p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] text-muted-foreground"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {actualTheme === 'dark' ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
      </button>

      <button
        onClick={onOpenSettings}
        className="flex items-center justify-center p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] text-muted-foreground"
        aria-label="Settings"
        title="Settings (Ctrl+,)"
      >
        <Settings size={18} className="sm:w-5 sm:h-5" />
      </button>
    </nav>
  )
}
