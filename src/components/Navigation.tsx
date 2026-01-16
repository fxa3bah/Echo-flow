import { Home, FileText, Calendar, Grid3x3, BookOpen, Moon, Sun, Settings } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { cn } from '../lib/utils'

type View = 'home' | 'transcriptions' | 'calendar' | 'matrix' | 'diary'

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
    { id: 'transcriptions' as View, icon: FileText, label: 'Transcriptions' },
    { id: 'calendar' as View, icon: Calendar, label: 'Calendar' },
    { id: 'matrix' as View, icon: Grid3x3, label: 'Matrix' },
    { id: 'diary' as View, icon: BookOpen, label: 'Diary' },
  ]

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
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
        className="ml-2 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <button
        onClick={onOpenSettings}
        className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Settings"
        title="Settings (Ctrl+,)"
      >
        <Settings size={20} />
      </button>
    </nav>
  )
}
