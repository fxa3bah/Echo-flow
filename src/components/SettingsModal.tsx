import { X, FileJson, FileText, Upload, Download, FolderSync, Check, LogOut, Database } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { exportAsJSON, exportAsText } from '../lib/export'
import { downloadDataAsFile, importData, selectSyncFolder, saveToSyncFolder, loadFromSyncFolder, startAutoSync, isSyncFolderSet, getLastSyncTime } from '../services/dataSync'
import {
  signOut as signOutFromSupabase,
  getSupabaseLastSyncTime,
  getCurrentUser,
  syncSupabaseMostRecent,
  pullSupabaseMostRecent,
} from '../services/supabaseSync'
import { cn } from '../lib/utils'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncFolderName, setSyncFolderName] = useState<string | null>(isSyncFolderSet() ? localStorage.getItem('syncFolderName') : null)
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Supabase state
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<string | null>(null)
  const [supabaseSyncing, setSupabaseSyncing] = useState(false)
  const [supabaseLastSync, setSupabaseLastSync] = useState<string | null>(getSupabaseLastSyncTime())

  // Refresh auth state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load Supabase user
      getCurrentUser().then(user => setSupabaseUser(user))
      setSupabaseLastSync(getSupabaseLastSyncTime())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleExportJSON = async () => {
    await exportAsJSON()
  }

  const handleExportText = async () => {
    await exportAsText()
  }

  const handleDownloadBackup = async () => {
    await downloadDataAsFile()
    setSyncStatus('Backup downloaded successfully!')
    setTimeout(() => setSyncStatus(null), 3000)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = await importData(text)

      if (result.success) {
        setImportStatus(
          `✓ Imported ${result.imported.transcriptions} transcriptions, ` +
          `${result.imported.entries} entries, and ${result.imported.diaryEntries} diary entries!`
        )
      } else {
        setImportStatus(`✗ Import failed: ${result.error}`)
      }

      setTimeout(() => setImportStatus(null), 5000)
    } catch (error: any) {
      setImportStatus(`✗ Error: ${error.message}`)
      setTimeout(() => setImportStatus(null), 5000)
    }

    // Reset file input
    event.target.value = ''
  }

  const handleSelectSyncFolder = async () => {
    const result = await selectSyncFolder()

    if (result.success) {
      const folderName = localStorage.getItem('syncFolderName')
      setSyncFolderName(folderName)
      setSyncStatus('✓ Sync folder selected! Auto-sync enabled.')
      startAutoSync(5) // Auto-sync every 5 minutes

      // Do initial sync
      await handleSaveToCloud()
    } else {
      setSyncStatus(`✗ Error: ${result.error}`)
    }

    setTimeout(() => setSyncStatus(null), 5000)
  }

  const handleSaveToCloud = async () => {
    setSyncing(true)
    setSyncStatus('Saving to cloud...')

    const result = await saveToSyncFolder()

    if (result.success) {
      setLastSync(getLastSyncTime())
      setSyncStatus('✓ Saved to cloud successfully!')
    } else {
      setSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setSyncStatus(null), 5000)
  }

  const handleLoadFromCloud = async () => {
    setSyncing(true)
    setSyncStatus('Loading from cloud...')

    const result = await loadFromSyncFolder()

    if (result.success) {
      setLastSync(getLastSyncTime())
      setSyncStatus('✓ Loaded from cloud successfully!')
    } else {
      setSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setSyncStatus(null), 5000)
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Supabase handlers
  const handleSupabaseSignOut = async () => {
    const result = await signOutFromSupabase()
    if (result.success) {
      setSupabaseUser(null)
      setSupabaseSyncStatus('✓ Signed out successfully')
      // Reload page to show login screen
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      setSupabaseSyncStatus(`✗ Error: ${result.error}`)
      setTimeout(() => setSupabaseSyncStatus(null), 5000)
    }
  }

  const handleSupabaseSyncNow = async () => {
    setSupabaseSyncing(true)
    setSupabaseSyncStatus('Syncing most recent data...')

    const result = await syncSupabaseMostRecent()

    if (result.success) {
      setSupabaseLastSync(getSupabaseLastSyncTime())
      if (result.action === 'upload') {
        setSupabaseSyncStatus('✓ Synced: uploaded newer local data.')
      } else if (result.action === 'download') {
        setSupabaseSyncStatus('✓ Synced: pulled newer cloud data.')
      } else {
        setSupabaseSyncStatus('✓ No changes to sync yet.')
      }
    } else {
      setSupabaseSyncStatus(`✗ Error: ${result.error}`)
    }

    setSupabaseSyncing(false)
    setTimeout(() => setSupabaseSyncStatus(null), 5000)
  }

  const handleSupabasePullLatest = async () => {
    setSupabaseSyncing(true)
    setSupabaseSyncStatus('Checking cloud for latest data...')

    const result = await pullSupabaseMostRecent()

    if (result.success) {
      setSupabaseLastSync(getSupabaseLastSyncTime())
      if (result.action === 'download') {
        setSupabaseSyncStatus('✓ Pulled newer cloud data.')
      } else if (result.action === 'upload') {
        setSupabaseSyncStatus('✓ Local data was newer, uploaded instead.')
      } else {
        setSupabaseSyncStatus('✓ No changes to pull yet.')
      }
    } else {
      setSupabaseSyncStatus(`✗ Error: ${result.error}`)
    }

    setSupabaseSyncing(false)
    setTimeout(() => setSupabaseSyncStatus(null), 5000)
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

          {/* Cloud Sync Status */}
          <section className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cloud Sync
            </h3>

            {supabaseUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Signed in as: {supabaseUser.email}</span>
                </div>

                {/* Real-time sync indicator */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-muted-foreground">Real-time sync active</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last synced: {formatLastSync(supabaseLastSync)}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSupabaseSyncNow}
                    disabled={supabaseSyncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-emerald-600 text-white hover:bg-emerald-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {supabaseSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    onClick={handleSupabasePullLatest}
                    disabled={supabaseSyncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-teal-600 text-white hover:bg-teal-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    {supabaseSyncing ? 'Checking...' : 'Pull Latest'}
                  </button>
                  <button
                    onClick={handleSupabaseSignOut}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                      'transition-colors'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please sign in to enable cloud sync
              </p>
            )}

            {supabaseSyncStatus && (
              <div className={cn(
                'mt-3 p-2 rounded text-sm',
                supabaseSyncStatus.includes('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              )}>
                {supabaseSyncStatus}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              ✨ All changes are automatically synced across devices in real-time. Manual sync always keeps the most recent data source.
            </p>
          </section>

          {/* Local Folder Sync (Desktop Only) */}
          <section className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FolderSync className="w-5 h-5" />
              Local Folder Sync (Desktop Only)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a local folder synced with cloud storage. Note: This only works on desktop browsers, not mobile.
            </p>

            {syncFolderName ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Syncing to: {syncFolderName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last synced: {formatLastSync(lastSync)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToCloud}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-blue-600 text-white hover:bg-blue-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {syncing ? 'Saving...' : 'Save Now'}
                  </button>
                  <button
                    onClick={handleLoadFromCloud}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-cyan-600 text-white hover:bg-cyan-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    {syncing ? 'Loading...' : 'Load Now'}
                  </button>
                  <button
                    onClick={handleSelectSyncFolder}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                      'transition-colors'
                    )}
                  >
                    <FolderSync className="w-4 h-4" />
                    Change Folder
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSelectSyncFolder}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'transition-colors'
                )}
              >
                <FolderSync size={18} />
                Select Sync Folder
              </button>
            )}

            {syncStatus && (
              <div className={cn(
                'mt-3 p-2 rounded text-sm',
                syncStatus.includes('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              )}>
                {syncStatus}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              💡 Tip: Select a folder that's synced with OneDrive, Google Drive, or Dropbox. Changes will auto-sync every 5 minutes!
            </p>
          </section>

          {/* Export & Import */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Backup & Restore</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download a backup or import data from a previous backup.
            </p>

            <div className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleDownloadBackup}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'transition-colors'
                  )}
                >
                  <Download size={18} />
                  Download Backup
                </button>
                <button
                  onClick={handleImportClick}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                    'transition-colors'
                  )}
                >
                  <Upload size={18} />
                  Import Backup
                </button>
                <button
                  onClick={handleExportJSON}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                    'transition-colors'
                  )}
                >
                  <FileJson size={18} />
                  Export JSON
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
                  Export Text
                </button>
              </div>

              {importStatus && (
                <div className={cn(
                  'p-2 rounded text-sm',
                  importStatus.includes('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                )}>
                  {importStatus}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
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
