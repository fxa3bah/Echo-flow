/**
 * Microsoft OneDrive API Integration for Echo Flow
 *
 * This service provides OAuth 2.0 authentication and file sync with OneDrive.
 * Uses Microsoft Graph API with implicit flow for browser-based authentication.
 *
 * Setup Instructions:
 * 1. Go to https://portal.azure.com/
 * 2. Navigate to Azure Active Directory > App registrations
 * 3. Click "New registration"
 * 4. Name: "Echo Flow"
 * 5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
 * 6. Redirect URI: Web - http://localhost:5173 (add production URL too)
 * 7. After creation, go to "Authentication"
 * 8. Enable "Access tokens" and "ID tokens" under Implicit grant
 * 9. Go to "API permissions" and add: Files.ReadWrite (Microsoft Graph)
 * 10. Copy the "Application (client) ID" and update MICROSOFT_CLIENT_ID below
 */

import { exportAllData, importData } from './dataSync'

// CONFIGURATION: Update with your Microsoft OAuth Client ID
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID_HERE'
const REDIRECT_URI = window.location.origin
const SCOPE = 'Files.ReadWrite offline_access'
const FILE_NAME = 'echo-flow-data.json'
const FOLDER_NAME = 'EchoFlow'

// Storage keys
const TOKEN_KEY = 'oneDrive_accessToken'
const TOKEN_EXPIRY_KEY = 'oneDrive_tokenExpiry'
const USER_INFO_KEY = 'oneDrive_userInfo'
const FILE_ID_KEY = 'oneDrive_fileId'

interface UserInfo {
  email: string
  name: string
}

/**
 * Generate random state for OAuth security
 */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Store OAuth state
 */
function storeState(state: string) {
  sessionStorage.setItem('oneDrive_oauth_state', state)
}

/**
 * Verify OAuth state
 */
function verifyState(state: string): boolean {
  const storedState = sessionStorage.getItem('oneDrive_oauth_state')
  sessionStorage.removeItem('oneDrive_oauth_state')
  return state === storedState
}

/**
 * Check if user is authenticated
 */
export function isOneDriveAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY)
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

  if (!token || !expiry) return false

  // Check if token is expired
  const expiryTime = parseInt(expiry, 10)
  const now = Date.now()

  return now < expiryTime
}

/**
 * Get stored access token
 */
function getAccessToken(): string | null {
  if (!isOneDriveAuthenticated()) {
    return null
  }
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Store access token
 */
function storeAccessToken(token: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY, token)
  const expiryTime = Date.now() + (expiresIn * 1000)
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
}

/**
 * Get stored user info
 */
export function getOneDriveUserInfo(): UserInfo | null {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY)
  if (!userInfoStr) return null
  try {
    return JSON.parse(userInfoStr)
  } catch {
    return null
  }
}

/**
 * Initiate Microsoft OAuth 2.0 flow
 */
export async function signInWithMicrosoft(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if client ID is configured
    if (MICROSOFT_CLIENT_ID === 'YOUR_MICROSOFT_CLIENT_ID_HERE') {
      return {
        success: false,
        error: 'OneDrive is not configured. Please set VITE_MICROSOFT_CLIENT_ID in .env file.',
      }
    }

    const state = generateState()
    storeState(state)

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPE,
      state: state,
      prompt: 'select_account',
    })

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`

    // Redirect to Microsoft OAuth
    window.location.href = authUrl

    return { success: true }
  } catch (error: any) {
    console.error('Microsoft sign-in error:', error)
    return {
      success: false,
      error: error.message || 'Failed to initiate Microsoft sign-in',
    }
  }
}

/**
 * Handle OAuth redirect callback
 */
export async function handleMicrosoftOAuthCallback(): Promise<{ success: boolean; error?: string }> {
  try {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const accessToken = params.get('access_token')
    const state = params.get('state')
    const expiresIn = params.get('expires_in')

    if (!accessToken || !state || !expiresIn) {
      return { success: false }
    }

    // Verify state
    if (!verifyState(state)) {
      return {
        success: false,
        error: 'Invalid OAuth state. Possible security issue.',
      }
    }

    // Store token
    storeAccessToken(accessToken, parseInt(expiresIn, 10))

    // Fetch user info
    const userInfo = await fetchMicrosoftUserInfo(accessToken)
    if (userInfo) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
    }

    // Clear hash from URL
    window.history.replaceState(null, '', window.location.pathname)

    return { success: true }
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return {
      success: false,
      error: error.message || 'Failed to handle OAuth callback',
    }
  }
}

/**
 * Fetch user info from Microsoft Graph
 */
async function fetchMicrosoftUserInfo(accessToken: string): Promise<UserInfo | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const data = await response.json()
    return {
      email: data.userPrincipalName || data.mail,
      name: data.displayName,
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    return null
  }
}

/**
 * Sign out from OneDrive
 */
export function signOutFromOneDrive() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  localStorage.removeItem(USER_INFO_KEY)
  localStorage.removeItem(FILE_ID_KEY)
}

/**
 * Get or create EchoFlow folder in OneDrive
 */
async function getOrCreateFolder(): Promise<{ folderId: string; error?: string } | null> {
  const token = getAccessToken()
  if (!token) {
    return null
  }

  try {
    // Try to get the folder
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${FOLDER_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      return { folderId: data.id }
    }

    // Create folder if it doesn't exist
    const createResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/drive/root/children',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: FOLDER_NAME,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      }
    )

    if (!createResponse.ok) {
      throw new Error('Failed to create folder')
    }

    const createData = await createResponse.json()
    return { folderId: createData.id }
  } catch (error: any) {
    console.error('Error getting/creating folder:', error)
    return { folderId: '', error: error.message }
  }
}

/**
 * Find or create Echo Flow data file in OneDrive
 */
async function getOrCreateFile(): Promise<{ fileId: string; error?: string } | null> {
  const token = getAccessToken()
  if (!token) {
    return null
  }

  try {
    // Check if we have stored file ID
    const storedFileId = localStorage.getItem(FILE_ID_KEY)
    if (storedFileId) {
      // Verify file still exists
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${storedFileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        return { fileId: storedFileId }
      }

      // File doesn't exist anymore, remove stored ID
      localStorage.removeItem(FILE_ID_KEY)
    }

    // Get or create folder
    const folderResult = await getOrCreateFolder()
    if (!folderResult || folderResult.error) {
      return { fileId: '', error: folderResult?.error || 'Failed to get folder' }
    }

    // Try to get the file
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${FOLDER_NAME}/${FILE_NAME}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      const fileId = data.id
      localStorage.setItem(FILE_ID_KEY, fileId)
      return { fileId }
    }

    // File doesn't exist, will be created on first upload
    return { fileId: '' }
  } catch (error: any) {
    console.error('Error getting/creating file:', error)
    return { fileId: '', error: error.message }
  }
}

/**
 * Upload data to OneDrive
 */
export async function uploadToOneDrive(): Promise<{ success: boolean; error?: string }> {
  const token = getAccessToken()
  if (!token) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in first.',
    }
  }

  try {
    // Export data
    const jsonData = await exportAllData()

    // Get or create folder
    const folderResult = await getOrCreateFolder()
    if (!folderResult || folderResult.error) {
      return {
        success: false,
        error: folderResult?.error || 'Failed to get folder',
      }
    }

    // Upload to OneDrive (create or update)
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${FOLDER_NAME}/${FILE_NAME}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: jsonData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Upload failed')
    }

    const data = await response.json()
    localStorage.setItem(FILE_ID_KEY, data.id)

    // Update last sync time
    localStorage.setItem('oneDrive_lastSyncTime', new Date().toISOString())

    return { success: true }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload to OneDrive',
    }
  }
}

/**
 * Download data from OneDrive
 */
export async function downloadFromOneDrive(): Promise<{ success: boolean; error?: string; imported?: { transcriptions: number; entries: number; diaryEntries: number } }> {
  const token = getAccessToken()
  if (!token) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in first.',
    }
  }

  try {
    // Get file
    const fileResult = await getOrCreateFile()
    if (!fileResult || !fileResult.fileId || fileResult.error) {
      return {
        success: false,
        error: fileResult?.error || 'File not found. Please upload data first.',
      }
    }

    // Download from OneDrive
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileResult.fileId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Download failed')
    }

    const jsonData = await response.text()

    // Import data
    const result = await importData(jsonData)

    if (result.success) {
      localStorage.setItem('oneDrive_lastSyncTime', new Date().toISOString())
    }

    return result
  } catch (error: any) {
    console.error('Download error:', error)
    return {
      success: false,
      error: error.message || 'Failed to download from OneDrive',
    }
  }
}

/**
 * Get last sync time
 */
export function getOneDriveLastSyncTime(): string | null {
  return localStorage.getItem('oneDrive_lastSyncTime')
}

/**
 * Auto-sync with OneDrive
 */
let oneDriveAutoSyncInterval: number | null = null

export function startOneDriveAutoSync(intervalMinutes: number = 5) {
  if (oneDriveAutoSyncInterval) {
    clearInterval(oneDriveAutoSyncInterval)
  }

  oneDriveAutoSyncInterval = window.setInterval(async () => {
    if (isOneDriveAuthenticated()) {
      const result = await uploadToOneDrive()
      if (result.success) {
        console.log('OneDrive auto-sync completed')
      } else {
        console.error('OneDrive auto-sync failed:', result.error)
      }
    }
  }, intervalMinutes * 60 * 1000)
}

export function stopOneDriveAutoSync() {
  if (oneDriveAutoSyncInterval) {
    clearInterval(oneDriveAutoSyncInterval)
    oneDriveAutoSyncInterval = null
  }
}
