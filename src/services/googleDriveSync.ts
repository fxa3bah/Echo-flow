/**
 * Google Drive API Integration for Echo Flow
 *
 * This service provides OAuth 2.0 authentication and file sync with Google Drive.
 * Uses the implicit flow for browser-based authentication.
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Drive API
 * 4. Create OAuth 2.0 credentials (Web application)
 * 5. Add authorized JavaScript origins: http://localhost:5173, your production URL
 * 6. Add authorized redirect URIs: http://localhost:5173, your production URL
 * 7. Copy the Client ID and update GOOGLE_CLIENT_ID below
 */

import { exportAllData, importData } from './dataSync'

// CONFIGURATION: Update with your Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'
const REDIRECT_URI = window.location.origin
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILE_NAME = 'echo-flow-data.json'
const MIME_TYPE = 'application/json'

// Storage keys
const TOKEN_KEY = 'googleDrive_accessToken'
const TOKEN_EXPIRY_KEY = 'googleDrive_tokenExpiry'
const USER_INFO_KEY = 'googleDrive_userInfo'
const FILE_ID_KEY = 'googleDrive_fileId'

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
}

interface UserInfo {
  email: string
  name: string
  picture?: string
}

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
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
  sessionStorage.setItem('googleDrive_oauth_state', state)
}

/**
 * Verify OAuth state
 */
function verifyState(state: string): boolean {
  const storedState = sessionStorage.getItem('googleDrive_oauth_state')
  sessionStorage.removeItem('googleDrive_oauth_state')
  return state === storedState
}

/**
 * Check if user is authenticated
 */
export function isGoogleDriveAuthenticated(): boolean {
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
  if (!isGoogleDriveAuthenticated()) {
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
export function getGoogleDriveUserInfo(): UserInfo | null {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY)
  if (!userInfoStr) return null
  try {
    return JSON.parse(userInfoStr)
  } catch {
    return null
  }
}

/**
 * Initiate Google OAuth 2.0 flow
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if client ID is configured
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      return {
        success: false,
        error: 'Google Drive is not configured. Please set VITE_GOOGLE_CLIENT_ID in .env file.',
      }
    }

    const state = generateState()
    storeState(state)

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPE,
      state: state,
      prompt: 'select_account',
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // Redirect to Google OAuth
    window.location.href = authUrl

    return { success: true }
  } catch (error: any) {
    console.error('Google sign-in error:', error)
    return {
      success: false,
      error: error.message || 'Failed to initiate Google sign-in',
    }
  }
}

/**
 * Handle OAuth redirect callback
 */
export async function handleGoogleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
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
    const userInfo = await fetchGoogleUserInfo(accessToken)
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
 * Fetch user info from Google
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<UserInfo | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const data = await response.json()
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    return null
  }
}

/**
 * Sign out from Google Drive
 */
export function signOutFromGoogle() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  localStorage.removeItem(USER_INFO_KEY)
  localStorage.removeItem(FILE_ID_KEY)
}

/**
 * Find or create Echo Flow data file in Google Drive
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
        `https://www.googleapis.com/drive/v3/files/${storedFileId}?fields=id,name`,
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

    // Search for existing file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!searchResponse.ok) {
      throw new Error('Failed to search for file')
    }

    const searchData = await searchResponse.json()

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id
      localStorage.setItem(FILE_ID_KEY, fileId)
      return { fileId }
    }

    // Create new file
    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: FILE_NAME,
          mimeType: MIME_TYPE,
        }),
      }
    )

    if (!createResponse.ok) {
      throw new Error('Failed to create file')
    }

    const createData = await createResponse.json()
    const fileId = createData.id
    localStorage.setItem(FILE_ID_KEY, fileId)

    return { fileId }
  } catch (error: any) {
    console.error('Error getting/creating file:', error)
    return { fileId: '', error: error.message }
  }
}

/**
 * Upload data to Google Drive
 */
export async function uploadToGoogleDrive(): Promise<{ success: boolean; error?: string }> {
  const token = getAccessToken()
  if (!token) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in first.',
    }
  }

  try {
    // Get or create file
    const fileResult = await getOrCreateFile()
    if (!fileResult || fileResult.error) {
      return {
        success: false,
        error: fileResult?.error || 'Failed to get file',
      }
    }

    // Export data
    const jsonData = await exportAllData()

    // Upload to Google Drive
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileResult.fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': MIME_TYPE,
        },
        body: jsonData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Upload failed')
    }

    // Update last sync time
    localStorage.setItem('googleDrive_lastSyncTime', new Date().toISOString())

    return { success: true }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload to Google Drive',
    }
  }
}

/**
 * Download data from Google Drive
 */
export async function downloadFromGoogleDrive(): Promise<{ success: boolean; error?: string; imported?: { transcriptions: number; entries: number; diaryEntries: number } }> {
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
    if (!fileResult || fileResult.error) {
      return {
        success: false,
        error: fileResult?.error || 'Failed to get file',
      }
    }

    // Download from Google Drive
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileResult.fileId}?alt=media`,
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
      localStorage.setItem('googleDrive_lastSyncTime', new Date().toISOString())
    }

    return result
  } catch (error: any) {
    console.error('Download error:', error)
    return {
      success: false,
      error: error.message || 'Failed to download from Google Drive',
    }
  }
}

/**
 * Get last sync time
 */
export function getGoogleDriveLastSyncTime(): string | null {
  return localStorage.getItem('googleDrive_lastSyncTime')
}

/**
 * Auto-sync with Google Drive
 */
let googleDriveAutoSyncInterval: number | null = null

export function startGoogleDriveAutoSync(intervalMinutes: number = 5) {
  if (googleDriveAutoSyncInterval) {
    clearInterval(googleDriveAutoSyncInterval)
  }

  googleDriveAutoSyncInterval = window.setInterval(async () => {
    if (isGoogleDriveAuthenticated()) {
      const result = await uploadToGoogleDrive()
      if (result.success) {
        console.log('Google Drive auto-sync completed')
      } else {
        console.error('Google Drive auto-sync failed:', result.error)
      }
    }
  }, intervalMinutes * 60 * 1000)
}

export function stopGoogleDriveAutoSync() {
  if (googleDriveAutoSyncInterval) {
    clearInterval(googleDriveAutoSyncInterval)
    googleDriveAutoSyncInterval = null
  }
}
