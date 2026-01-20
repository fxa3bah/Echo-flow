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

  // Show main app
  console.log('Rendering main app...')
  return (
    <div className={cn('min-h-screen transition-colors duration-200', theme)}>
      <div className="flex flex-col h-screen">
        {/* Header - Sticky Navigation */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-center gap-3 sm:gap-4 max-w-7xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground whitespace-nowrap">Echo Flow</h1>
            </div>
            <div className="flex-1 flex justify-center">
              <Navigation
                currentView={currentView}
                onViewChange={setCurrentView}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {currentView === 'home' && (
            <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Capture Your Thoughts</h2>
                <p className="text-sm sm:text-base text-muted-foreground px-2">
                  Voice record or use AI Chat to quickly capture tasks, notes, and ideas
                </p>
              </div>
              <VoiceRecorder />

              {/* AI Chat Link */}
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Need AI assistance?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Chat with AI to organize tasks, get insights, and manage your day
                </p>
                <button
                  onClick={() => setCurrentView('aiinsights')}
                  className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
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
