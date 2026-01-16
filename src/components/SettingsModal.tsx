import { X, FileJson, FileText } from 'lucide-react'
import { exportAsJSON, exportAsText } from '../lib/export'
import { cn } from '../lib/utils'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null

  const handleExportJSON = async () => {
    await exportAsJSON()
  }

  const handleExportText = async () => {
    await exportAsText()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Record View</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + R</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Transcriptions</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + T</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Calendar</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + C</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Eisenhower Matrix</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + M</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Diary</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + D</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Settings</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl + ,</kbd>
              </div>
            </div>
          </section>

          {/* Export Data */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Export Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Export all your data including transcriptions, entries, and diary entries.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExportJSON}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'transition-colors'
                )}
              >
                <FileJson size={18} />
                Export as JSON
              </button>
              <button
                onClick={handleExportText}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                  'transition-colors'
                )}
              >
                <FileText size={18} />
                Export as Text
              </button>
            </div>
          </section>

          {/* About */}
          <section>
            <h3 className="text-lg font-semibold mb-4">About</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Echo Flow</strong> is a voice-first productivity app that helps you
                capture thoughts, manage tasks, and organize your day.
              </p>
              <p>Version 1.0.0</p>
            </div>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>One-tap voice recording with automatic transcription</li>
              <li>AI-powered categorization of entries</li>
              <li>Smart calendar with date detection</li>
              <li>Eisenhower Matrix for task prioritization</li>
              <li>Rich text diary with markdown support</li>
              <li>Offline-first with PWA support</li>
              <li>Dark and light mode</li>
              <li>Keyboard shortcuts for power users</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
