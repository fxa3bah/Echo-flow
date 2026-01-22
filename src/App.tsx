import { useState, useEffect } from 'react'
import { useThemeStore } from './stores/themeStore'
import { VoiceRecorder } from './components/VoiceRecorder'
import { Navigation } from './components/Navigation'
import { AllEntries } from './components/AllEntries'
import { CalendarView } from './components/CalendarView'
import { FocusView } from './components/FocusView'
import { DiaryEditor } from './components/DiaryEditor'
import { ArchiveView } from './components/ArchiveView'
import { AIInsights } from './components/AIInsights'
import { SettingsModal } from './components/SettingsModal'
import { LoginScreen } from './components/LoginScreen'
import { QuickActionCard } from './components/QuickActionCard'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { getCurrentUser, isSupabaseConfigured } from './services/supabaseSync'
import { cn, ensureString } from './lib/utils'
import { db } from './lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings } from 'lucide-react'

type View = 'home' | 'aiinsights' | 'entries' | 'calendar' | 'focus' | 'diary' | 'archive'

function App() {
  console.log('App component rendering...')
  const [currentView, setCurrentView] = useState<View>('home')
  const [showSettings, setShowSettings] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { theme } = useThemeStore()
  console.log('App state:', { isAuthenticated, isCheckingAuth, theme })

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking auth...')
      console.log('Supabase configured:', isSupabaseConfigured())

      if (!isSupabaseConfigured()) {
        // Supabase not configured, allow offline use
        console.log('Supabase not configured, allowing offline use')
        setIsAuthenticated(false)
        setIsCheckingAuth(false)
        return
      }

      console.log('Getting current user...')
      const user = await getCurrentUser()
      console.log('Current user:', user)
      setIsAuthenticated(!!user)
      setIsCheckingAuth(false)
    }

    checkAuth().catch(err => {
      console.error('Auth check failed:', err)
      // Fallback to offline mode on error
      setIsAuthenticated(false)
      setIsCheckingAuth(false)
    })
  }, [])

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrlKey: true,
      handler: () => setCurrentView('home'),
    },
    {
      key: 'a',
      ctrlKey: true,
      handler: () => setCurrentView('aiinsights'),
    },
    {
      key: 'e',
      ctrlKey: true,
      handler: () => setCurrentView('entries'),
    },
    {
      key: 'f',
      ctrlKey: true,
      handler: () => setCurrentView('focus'),
    },
    {
      key: 'd',
      ctrlKey: true,
      handler: () => setCurrentView('diary'),
    },
    {
      key: 'b',
      ctrlKey: true,
      handler: () => setCurrentView('archive'),
    },
    {
      key: ',',
      ctrlKey: true,
      handler: () => setShowSettings(true),
    },
  ])
  useReminderNotifications()

  // Show loading while checking auth
  if (isCheckingAuth) {
    console.log('Rendering loading screen...')
    return (
      <div
        className={cn('min-h-screen flex items-center justify-center transition-colors duration-200', theme)}
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-center" style={{ textAlign: 'center' }}>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4" style={{
            width: '48px',
            height: '48px',
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: '#3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            marginBottom: '16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading Echo Flow...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated && isSupabaseConfigured()) {
    console.log('Rendering login screen...')
    return (
      <div className={cn('transition-colors duration-200', theme)}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen transition-colors duration-200 flex overflow-hidden', theme)}>
      {/* Side Navigation - Wide Screens / Foldables Opened */}
      <aside className="hidden md:flex flex-col w-16 lg:w-64 border-r border-border bg-background/95 backdrop-blur shrink-0 transition-all duration-300">
        <div className="p-4 border-b border-border mb-4 flex items-center justify-center lg:justify-start overflow-hidden">
          <h1 className="text-xl font-bold text-foreground">
            <span className="hidden lg:inline">Echo Flow</span>
            <span className="lg:hidden">EF</span>
          </h1>
        </div>
        <Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSettings={() => setShowSettings(true)}
          orientation="vertical"
        />
      </aside>

      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Header - Mobile Only or common status */}
        <header className="md:hidden sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <h1 className="text-lg font-bold text-foreground">Echo Flow</h1>
          {/* We can put secondary actions here if needed */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {currentView === 'home' && (
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
              <div className="text-center mb-6 sm:mb-8 px-2">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Capture Your Thoughts</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Voice record or use AI Chat to quickly capture tasks, notes, and ideas
                </p>
              </div>
              <VoiceRecorder />

              <QuickActionCard />

              {/* Recent Activity Section */}
              <div className="mt-12 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Recent Pulse</h3>
                  <button
                    onClick={() => setCurrentView('entries')}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    View All Studio
                  </button>
                </div>

                <RecentEntriesList />
              </div>
            </div>
          )}

          {currentView === 'aiinsights' && <AIInsights />}
          {currentView === 'entries' && <AllEntries />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'focus' && <FocusView />}
          {currentView === 'archive' && <ArchiveView />}
          {currentView === 'diary' && <DiaryEditor />}
        </main>

        {/* Bottom Navigation - Mobile Portrait Only */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur px-2 py-1 pb-safe shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)]">
          <Navigation
            currentView={currentView}
            onViewChange={setCurrentView}
            onOpenSettings={() => setShowSettings(true)}
            orientation="horizontal"
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

const RecentEntriesList = () => {
  const entries = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().limit(3).toArray()) || []

  if (entries.length === 0) return null

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div
          key={entry.id}
          className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-3xl p-5 transition-all hover:border-primary/20 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
              entry.type === 'todo' ? "bg-emerald-500/10 text-emerald-600" :
                entry.type === 'reminder' ? "bg-purple-500/10 text-purple-600" :
                  entry.type === 'diary' ? "bg-orange-500/10 text-orange-600" :
                    "bg-blue-500/10 text-blue-600"
            )}>
              {entry.type}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
              {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {entry.title && (
            <div className="font-bold text-xs mb-0.5 text-foreground tracking-tight">{entry.title}</div>
          )}
          <div
            className="text-[11px] font-normal text-muted-foreground/70 line-clamp-2 prose-sm dark:prose-invert leading-tight tracking-tight"
            dangerouslySetInnerHTML={{ __html: ensureString(entry.content) }}
          />
        </div>
      ))}
    </div>
  )
}

export default App
