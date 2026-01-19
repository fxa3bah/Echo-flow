import { X, FileJson, FileText, Upload, Download, FolderSync, Cloud, Check, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { exportAsJSON, exportAsText } from '../lib/export'
import { downloadDataAsFile, importData, selectSyncFolder, saveToSyncFolder, loadFromSyncFolder, startAutoSync, isSyncFolderSet, getLastSyncTime } from '../services/dataSync'
import {
  isGoogleDriveAuthenticated,
  signInWithGoogle,
  signOutFromGoogle,
  getGoogleDriveUserInfo,
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
  getGoogleDriveLastSyncTime,
  startGoogleDriveAutoSync,
} from '../services/googleDriveSync'
import {
  isOneDriveAuthenticated,
  signInWithMicrosoft,
  signOutFromOneDrive,
  getOneDriveUserInfo,
  uploadToOneDrive,
  downloadFromOneDrive,
  getOneDriveLastSyncTime,
  startOneDriveAutoSync,
} from '../services/oneDriveSync'
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

  // Cloud sync state
  const [isGoogleAuthed, setIsGoogleAuthed] = useState(isGoogleDriveAuthenticated())
  const [isOneDriveAuthed, setIsOneDriveAuthed] = useState(isOneDriveAuthenticated())
  const [googleUser, setGoogleUser] = useState(getGoogleDriveUserInfo())
  const [oneDriveUser, setOneDriveUser] = useState(getOneDriveUserInfo())
  const [googleSyncStatus, setGoogleSyncStatus] = useState<string | null>(null)
  const [oneDriveSyncStatus, setOneDriveSyncStatus] = useState<string | null>(null)

  // Refresh auth state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsGoogleAuthed(isGoogleDriveAuthenticated())
      setIsOneDriveAuthed(isOneDriveAuthenticated())
      setGoogleUser(getGoogleDriveUserInfo())
      setOneDriveUser(getOneDriveUserInfo())
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

  // Google Drive handlers
  const handleGoogleSignIn = async () => {
    await signInWithGoogle()
  }

  const handleGoogleSignOut = () => {
    signOutFromGoogle()
    setIsGoogleAuthed(false)
    setGoogleUser(null)
    setGoogleSyncStatus('✓ Signed out successfully')
    setTimeout(() => setGoogleSyncStatus(null), 3000)
  }

  const handleGoogleUpload = async () => {
    setSyncing(true)
    setGoogleSyncStatus('Uploading to Google Drive...')

    const result = await uploadToGoogleDrive()

    if (result.success) {
      setGoogleSyncStatus('✓ Uploaded to Google Drive successfully!')
      // Start auto-sync
      startGoogleDriveAutoSync(5)
    } else {
      setGoogleSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setGoogleSyncStatus(null), 5000)
  }

  const handleGoogleDownload = async () => {
    setSyncing(true)
    setGoogleSyncStatus('Downloading from Google Drive...')

    const result = await downloadFromGoogleDrive()

    if (result.success) {
      setGoogleSyncStatus(`✓ Downloaded from Google Drive! Imported ${result.imported?.entries || 0} entries.`)
    } else {
      setGoogleSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setGoogleSyncStatus(null), 5000)
  }

  // OneDrive handlers
  const handleOneDriveSignIn = async () => {
    await signInWithMicrosoft()
  }

  const handleOneDriveSignOut = () => {
    signOutFromOneDrive()
    setIsOneDriveAuthed(false)
    setOneDriveUser(null)
    setOneDriveSyncStatus('✓ Signed out successfully')
    setTimeout(() => setOneDriveSyncStatus(null), 3000)
  }

  const handleOneDriveUpload = async () => {
    setSyncing(true)
    setOneDriveSyncStatus('Uploading to OneDrive...')

    const result = await uploadToOneDrive()

    if (result.success) {
      setOneDriveSyncStatus('✓ Uploaded to OneDrive successfully!')
      // Start auto-sync
      startOneDriveAutoSync(5)
    } else {
      setOneDriveSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setOneDriveSyncStatus(null), 5000)
  }

  const handleOneDriveDownload = async () => {
    setSyncing(true)
    setOneDriveSyncStatus('Downloading from OneDrive...')

    const result = await downloadFromOneDrive()

    if (result.success) {
      setOneDriveSyncStatus(`✓ Downloaded from OneDrive! Imported ${result.imported?.entries || 0} entries.`)
    } else {
      setOneDriveSyncStatus(`✗ Error: ${result.error}`)
    }

    setSyncing(false)
    setTimeout(() => setOneDriveSyncStatus(null), 5000)
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

          {/* Google Drive API Sync */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.42 6h6.84l3.42-6L8.29 3.5H7.71zM7 16l-1.5 2.5L3.15 16H7zm8.5 2.5L13.5 16h3.85l-2.35 2.5z"/>
              </svg>
              Google Drive Sync
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automatic cloud sync with Google Drive API. Works on all devices including mobile browsers!
            </p>

            {isGoogleAuthed && googleUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Signed in as: {googleUser.email}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last synced: {formatLastSync(getGoogleDriveLastSyncTime())}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleGoogleUpload}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-blue-600 text-white hover:bg-blue-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {syncing ? 'Uploading...' : 'Upload Now'}
                  </button>
                  <button
                    onClick={handleGoogleDownload}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-indigo-600 text-white hover:bg-indigo-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    {syncing ? 'Downloading...' : 'Download Now'}
                  </button>
                  <button
                    onClick={handleGoogleSignOut}
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
              <button
                onClick={handleGoogleSignIn}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'transition-colors'
                )}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                Sign in with Google
              </button>
            )}

            {googleSyncStatus && (
              <div className={cn(
                'mt-3 p-2 rounded text-sm',
                googleSyncStatus.includes('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              )}>
                {googleSyncStatus}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              ✨ Recommended! Auto-syncs every 5 minutes. No folder picker needed - works on mobile!
            </p>
          </section>

          {/* OneDrive API Sync */}
          <section className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.802 14.197a4.808 4.808 0 0 0-9.133-1.796A3.843 3.843 0 0 0 7.5 12C5.015 12 3 14.015 3 16.5S5.015 21 7.5 21h12c2.485 0 4.5-2.015 4.5-4.5 0-2.333-1.775-4.241-4.198-4.303z"/>
              </svg>
              OneDrive Sync
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Automatic cloud sync with Microsoft OneDrive. Works on all devices including mobile browsers!
            </p>

            {isOneDriveAuthed && oneDriveUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Signed in as: {oneDriveUser.email}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last synced: {formatLastSync(getOneDriveLastSyncTime())}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleOneDriveUpload}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-cyan-600 text-white hover:bg-cyan-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {syncing ? 'Uploading...' : 'Upload Now'}
                  </button>
                  <button
                    onClick={handleOneDriveDownload}
                    disabled={syncing}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'bg-blue-600 text-white hover:bg-blue-700',
                      'transition-colors disabled:opacity-50'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    {syncing ? 'Downloading...' : 'Download Now'}
                  </button>
                  <button
                    onClick={handleOneDriveSignOut}
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
              <button
                onClick={handleOneDriveSignIn}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-cyan-600 text-white hover:bg-cyan-700',
                  'transition-colors'
                )}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.802 14.197a4.808 4.808 0 0 0-9.133-1.796A3.843 3.843 0 0 0 7.5 12C5.015 12 3 14.015 3 16.5S5.015 21 7.5 21h12c2.485 0 4.5-2.015 4.5-4.5 0-2.333-1.775-4.241-4.198-4.303z"/>
                </svg>
                Sign in with Microsoft
              </button>
            )}

            {oneDriveSyncStatus && (
              <div className={cn(
                'mt-3 p-2 rounded text-sm',
                oneDriveSyncStatus.includes('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              )}>
                {oneDriveSyncStatus}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              ✨ Auto-syncs every 5 minutes. Perfect for Windows users! Works on mobile too.
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
