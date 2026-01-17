import { db } from '../lib/db'

export interface ExportData {
  version: string
  exportedAt: string
  transcriptions: any[]
  entries: any[]
  diaryEntries: any[]
}

// Export all data to JSON
export async function exportAllData(): Promise<string> {
  const [transcriptions, entries, diaryEntries] = await Promise.all([
    db.transcriptions.toArray(),
    db.entries.toArray(),
    db.diaryEntries.toArray(),
  ])

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transcriptions,
    entries,
    diaryEntries,
  }

  return JSON.stringify(exportData, null, 2)
}

// Import data from JSON
export async function importData(jsonData: string): Promise<{ success: boolean; error?: string; imported: { transcriptions: number; entries: number; diaryEntries: number } }> {
  try {
    const data: ExportData = JSON.parse(jsonData)

    // Validate data structure
    if (!data.version || !Array.isArray(data.transcriptions) || !Array.isArray(data.entries) || !Array.isArray(data.diaryEntries)) {
      return {
        success: false,
        error: 'Invalid data format. Please check the exported JSON file.',
        imported: { transcriptions: 0, entries: 0, diaryEntries: 0 },
      }
    }

    // Import data (add all items)
    await db.transaction('rw', [db.transcriptions, db.entries, db.diaryEntries], async () => {
      // Import transcriptions
      for (const item of data.transcriptions) {
        // Convert date strings back to Date objects
        if (item.createdAt) item.createdAt = new Date(item.createdAt)
        if (item.updatedAt) item.updatedAt = new Date(item.updatedAt)

        // Use put to update existing or add new
        await db.transcriptions.put(item)
      }

      // Import entries
      for (const item of data.entries) {
        if (item.date) item.date = new Date(item.date)
        if (item.createdAt) item.createdAt = new Date(item.createdAt)
        if (item.updatedAt) item.updatedAt = new Date(item.updatedAt)

        await db.entries.put(item)
      }

      // Import diary entries
      for (const item of data.diaryEntries) {
        if (item.date) item.date = new Date(item.date)
        if (item.createdAt) item.createdAt = new Date(item.createdAt)
        if (item.updatedAt) item.updatedAt = new Date(item.updatedAt)

        await db.diaryEntries.put(item)
      }
    })

    return {
      success: true,
      imported: {
        transcriptions: data.transcriptions.length,
        entries: data.entries.length,
        diaryEntries: data.diaryEntries.length,
      },
    }
  } catch (error: any) {
    console.error('Import error:', error)
    return {
      success: false,
      error: error.message || 'Failed to import data',
      imported: { transcriptions: 0, entries: 0, diaryEntries: 0 },
    }
  }
}

// Download data as JSON file
export async function downloadDataAsFile() {
  const jsonData = await exportAllData()
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `echo-flow-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Auto-sync with local folder (OneDrive/Google Drive sync)
let syncFolderHandle: FileSystemDirectoryHandle | null = null
let autoSyncInterval: number | null = null

export async function selectSyncFolder(): Promise<{ success: boolean; error?: string }> {
  try {
    // Request directory access
    // @ts-ignore - File System Access API
    if (!window.showDirectoryPicker) {
      return {
        success: false,
        error: 'File System Access API not supported. Please use Chrome, Edge, or Safari.',
      }
    }

    // @ts-ignore
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
    })

    syncFolderHandle = handle

    // Save to localStorage for persistence
    // Note: The handle itself can't be stored, but we can store its name
    if (syncFolderHandle) {
      localStorage.setItem('syncFolderName', syncFolderHandle.name)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Folder selection error:', error)
    return {
      success: false,
      error: error.message || 'Failed to select folder',
    }
  }
}

export async function saveToSyncFolder(): Promise<{ success: boolean; error?: string }> {
  if (!syncFolderHandle) {
    return {
      success: false,
      error: 'No sync folder selected. Please select a folder first.',
    }
  }

  try {
    // Export data
    const jsonData = await exportAllData()

    // Create/update file in sync folder
    const fileName = 'echo-flow-data.json'
    const fileHandle = await syncFolderHandle.getFileHandle(fileName, { create: true })

    // @ts-ignore
    const writable = await fileHandle.createWritable()
    await writable.write(jsonData)
    await writable.close()

    // Also save last sync time
    localStorage.setItem('lastSyncTime', new Date().toISOString())

    return { success: true }
  } catch (error: any) {
    console.error('Save to sync folder error:', error)
    return {
      success: false,
      error: error.message || 'Failed to save to sync folder',
    }
  }
}

export async function loadFromSyncFolder(): Promise<{ success: boolean; error?: string; imported?: { transcriptions: number; entries: number; diaryEntries: number } }> {
  if (!syncFolderHandle) {
    return {
      success: false,
      error: 'No sync folder selected. Please select a folder first.',
    }
  }

  try {
    const fileName = 'echo-flow-data.json'
    const fileHandle = await syncFolderHandle.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    const jsonData = await file.text()

    const result = await importData(jsonData)

    if (result.success) {
      localStorage.setItem('lastSyncTime', new Date().toISOString())
    }

    return result
  } catch (error: any) {
    console.error('Load from sync folder error:', error)
    return {
      success: false,
      error: error.message || 'Failed to load from sync folder',
    }
  }
}

// Start auto-sync (every 5 minutes)
export function startAutoSync(intervalMinutes: number = 5) {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
  }

  autoSyncInterval = window.setInterval(() => {
    // Only sync if folder is set
    if (syncFolderHandle !== null) {
      saveToSyncFolder().then((result) => {
        if (result.success) {
          console.log('Auto-sync completed successfully')
        } else {
          console.error('Auto-sync failed:', result.error)
        }
      })
    }
  }, intervalMinutes * 60 * 1000)
}

// Stop auto-sync
export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
  }
}

// Check if sync folder is set
export function isSyncFolderSet(): boolean {
  return !!localStorage.getItem('syncFolderName')
}

// Get last sync time
export function getLastSyncTime(): string | null {
  return localStorage.getItem('lastSyncTime')
}
