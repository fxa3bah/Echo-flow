import { Home, Database, Calendar, Target, BookOpen, Moon, Sun, Settings, Sparkles, Archive } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { cn } from '../lib/utils'

type View = 'home' | 'aiinsights' | 'entries' | 'calendar' | 'focus' | 'diary' | 'archive'

interface NavigationProps {
  currentView: View
  onViewChange: (view: View) => void
  onOpenSettings: () => void
  orientation?: 'horizontal' | 'vertical'
}

export function Navigation({ currentView, onViewChange, onOpenSettings, orientation = 'horizontal' }: NavigationProps) {
  const { setTheme, actualTheme } = useThemeStore()

  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark')
  }

  const navItems = [
    { id: 'home' as View, icon: Home, label: 'Record' },
    { id: 'focus' as View, icon: Target, label: 'Focus' },
    { id: 'diary' as View, icon: BookOpen, label: 'Diary' },
    { id: 'calendar' as View, icon: Calendar, label: 'Calendar' },
    { id: 'archive' as View, icon: Archive, label: 'Archive' },
    { id: 'aiinsights' as View, icon: Sparkles, label: 'AI Chat' },
    { id: 'entries' as View, icon: Database, label: 'All' },
  ]

  const isVertical = orientation === 'vertical'

  return (
    <nav className={cn(
      "flex gap-1 sm:gap-2",
      isVertical ? "flex-col w-full px-2 py-4 h-full items-center lg:items-start" : "items-center flex-1 justify-around sm:justify-end"
    )}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={cn(
            'flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg transition-all duration-200',
            'hover:bg-accent hover:text-accent-foreground group relative',
            'min-h-[44px] min-w-[44px]',
            isVertical ? "w-full justify-center lg:justify-start" : "justify-center",
            currentView === item.id
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'
          )}
          aria-label={item.label}
          title={item.label}
        >
          <item.icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", isVertical ? "" : "sm:w-5 sm:h-5")} />
          <span className={cn(
            "text-sm font-medium",
            isVertical ? "hidden lg:inline" : "hidden md:inline"
          )}>
            {item.label}
          </span>

          {/* Mobile Tooltip/Label indicator */}
          {!isVertical && currentView === item.id && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full md:hidden" />
          )}
        </button>
      ))}

      <div className={cn("mx-1 bg-border", isVertical ? "h-px w-full my-4" : "w-px h-6")} />

      <button
        onClick={toggleTheme}
        className={cn(
          "p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center",
          isVertical ? "w-full lg:justify-start lg:px-3" : ""
        )}
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        {isVertical && <span className="hidden lg:inline ml-2 text-sm font-medium">Theme</span>}
      </button>

      <button
        onClick={onOpenSettings}
        className={cn(
          "p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center",
          isVertical ? "w-full lg:justify-start lg:px-3" : ""
        )}
        aria-label="Settings"
        title="Settings (Ctrl+,)"
      >
        <Settings size={20} />
        {isVertical && <span className="hidden lg:inline ml-2 text-sm font-medium">Settings</span>}
      </button>
    </nav>
  )
}
