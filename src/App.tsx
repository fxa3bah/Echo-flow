import { useState } from 'react'
import { useThemeStore } from './stores/themeStore'
import { VoiceRecorder } from './components/VoiceRecorder'
import { Navigation } from './components/Navigation'
import { AllEntries } from './components/AllEntries'
import { CalendarView } from './components/CalendarView'
import { EisenhowerMatrix } from './components/EisenhowerMatrix'
import { DiaryEditor } from './components/DiaryEditor'
import { AIInsights } from './components/AIInsights'
import { AIChatBox } from './components/AIChatBox'
import { SettingsModal } from './components/SettingsModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { cn } from './lib/utils'

type View = 'home' | 'aiinsights' | 'entries' | 'calendar' | 'matrix' | 'diary'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [showSettings, setShowSettings] = useState(false)
  const { theme } = useThemeStore()

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
      key: 'c',
      ctrlKey: true,
      handler: () => setCurrentView('calendar'),
    },
    {
      key: 'm',
      ctrlKey: true,
      handler: () => setCurrentView('matrix'),
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
                  Tap the button below to start voice recording
                </p>
              </div>
              <VoiceRecorder />
              <AIChatBox />
            </div>
          )}

          {currentView === 'aiinsights' && <AIInsights />}
          {currentView === 'entries' && <AllEntries />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'matrix' && <EisenhowerMatrix />}
          {currentView === 'diary' && <DiaryEditor />}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

export default App
