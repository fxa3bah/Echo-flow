import { useState, useEffect } from 'react'
import { useThemeStore } from './stores/themeStore'
import { VoiceRecorder } from './components/VoiceRecorder'
import { Navigation } from './components/Navigation'
import { AllEntries } from './components/AllEntries'
import { CalendarView } from './components/CalendarView'
import { FocusView } from './components/FocusView'
import { DiaryEditor } from './components/DiaryEditor'
import { AIInsights } from './components/AIInsights'
import { SettingsModal } from './components/SettingsModal'
import { LoginScreen } from './components/LoginScreen'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useReminderNotifications } from './hooks/useReminderNotifications'
import { getCurrentUser, isSupabaseConfigured } from './services/supabaseSync'
import { cn } from './lib/utils'

type View = 'home' | 'aiinsights' | 'entries' | 'calendar' | 'focus' | 'diary'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [showSettings, setShowSettings] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { theme } = useThemeStore()

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured()) {
        // Supabase not configured, allow offline use
        setIsAuthenticated(false)
        setIsCheckingAuth(false)
        return
      }

      const user = await getCurrentUser()
      setIsAuthenticated(!!user)
      setIsCheckingAuth(false)
    }

    checkAuth()
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
      key: ',',
      ctrlKey: true,
      handler: () => setShowSettings(true),
    },
  ])
  useReminderNotifications()

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center transition-colors duration-200', theme)}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated && isSupabaseConfigured()) {
    return (
      <div className={cn('transition-colors duration-200', theme)}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  // Show main app
  return (
    <div className={cn('min-h-screen transition-colors duration-200', theme)}>
      <div className="flex flex-col h-screen">
        {/* Header - Sticky Navigation */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Echo Flow</h1>
          <Navigation
            currentView={currentView}
            onViewChange={setCurrentView}
            onOpenSettings={() => setShowSettings(true)}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {currentView === 'home' && (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Capture Your Thoughts</h2>
                <p className="text-muted-foreground">
                  Voice record or use AI Chat to quickly capture tasks, notes, and ideas
                </p>
              </div>
              <VoiceRecorder />

              {/* AI Chat Link */}
              <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <h3 className="text-lg font-semibold mb-2">Need AI assistance?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Chat with AI to organize tasks, get insights, and manage your day
                </p>
                <button
                  onClick={() => setCurrentView('aiinsights')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Open AI Chat
                </button>
              </div>
            </div>
          )}

          {currentView === 'aiinsights' && <AIInsights />}
          {currentView === 'entries' && <AllEntries />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'focus' && <FocusView />}
          {currentView === 'diary' && <DiaryEditor />}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

export default App
