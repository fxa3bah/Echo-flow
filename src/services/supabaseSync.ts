/**
 * Supabase Cloud Sync for Echo Flow
 *
 * This service provides email/password authentication and real-time cloud sync
 * with Supabase. No OAuth configuration needed - just API keys.
 *
 * Setup Instructions:
 * 1. Go to https://supabase.com/
 * 2. Create a new project (free tier)
 * 3. Go to Project Settings > API
 * 4. Copy the "Project URL" and "anon public" key
 * 5. Add to .env file:
 *    VITE_SUPABASE_URL=your-project-url
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 * 6. Go to Authentication > Providers > Email
 * 7. Disable "Confirm email" for instant signup
 * 8. Go to SQL Editor and run the schema below:
 *
 * -- Create user_data table
 * CREATE TABLE IF NOT EXISTS user_data (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   data JSONB NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   UNIQUE(user_id)
 * );
 *
 * -- Enable RLS
 * ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
 *
 * -- Policy: Users can only access their own data
 * CREATE POLICY "Users can CRUD their own data"
 *   ON user_data
 *   FOR ALL
 *   USING (auth.uid() = user_id)
 *   WITH CHECK (auth.uid() = user_id);
 *
 * -- Create index for faster queries
 * CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
import { exportAllData, importData, getLocalLatestUpdateTime } from './dataSync'

// CONFIGURATION: Update with your Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Initialize Supabase client
let supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured')
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabase
}

// User info interface
export interface SupabaseUserInfo {
  email: string
  id: string
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  // Check if Supabase is configured and not using placeholder values
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY &&
    SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '' &&
    !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_') &&
    !SUPABASE_URL.includes('your-') && !SUPABASE_ANON_KEY.includes('your-'))
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.',
      }
    }

    const client = getSupabaseClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Failed to create user',
      }
    }

    // Auto-sync data after signup and start real-time sync
    await uploadToSupabase()
    startSupabaseAutoSync(5)

    return {
      success: true,
      user: data.user,
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sign up',
    }
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.',
      }
    }

    const client = getSupabaseClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Failed to sign in',
      }
    }

    // Auto-sync data after login and start real-time sync
    await downloadFromSupabase()
    startSupabaseAutoSync(5)

    return {
      success: true,
      user: data.user,
    }
  } catch (error: any) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sign in',
    }
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabaseClient()
    const { error } = await client.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Stop all sync activities
    stopSupabaseAutoSync()

    return { success: true }
  } catch (error: any) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sign out',
    }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null
    }

    const client = getSupabaseClient()
    const { data } = await client.auth.getUser()
    return data.user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null
    }

    const client = getSupabaseClient()
    const { data } = await client.auth.getSession()
    return data.session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}

/**
 * Get user info
 */
export async function getSupabaseUserInfo(): Promise<SupabaseUserInfo | null> {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return null

    return {
      email: user.email,
      id: user.id,
    }
  } catch (error) {
    console.error('Get user info error:', error)
    return null
  }
}

/**
 * Upload data to Supabase
 */
export async function uploadToSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated. Please sign in first.',
      }
    }

    const client = getSupabaseClient()

    // Export data as JSON
    const jsonData = await exportAllData()
    const exportData = JSON.parse(jsonData)

    // Remove the version field from the data we send to Supabase
    // Store it in the JSONB data field instead of as a column
    const { version, ...dataToStore } = exportData

    console.log('[Supabase Upload] Uploading data without version field')

    // Upsert to user_data table
    const { error } = await client
      .from('user_data')
      .upsert({
        user_id: user.id,
        data: dataToStore,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      console.error('[Supabase Upload] Error:', error)
      return {
        success: false,
        error: `Supabase upload failed: ${error.message}. Please check your table schema matches the setup guide in the code.`,
      }
    }

    // Update last sync time
    localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())

    return { success: true }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload to Supabase',
    }
  }
}

/**
 * Download data from Supabase
 */
export async function downloadFromSupabase(): Promise<{
  success: boolean
  error?: string
  imported?: { transcriptions: number; entries: number; diaryEntries: number }
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Not authenticated. Please sign in first.',
      }
    }

    const client = getSupabaseClient()

    // Fetch user data
    const { data, error } = await client
      .from('user_data')
      .select('data')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no data exists yet, that's okay (first time user)
      if (error.code === 'PGRST116') {
        localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())
        return {
          success: true,
          imported: { transcriptions: 0, entries: 0, diaryEntries: 0 },
        }
      }

      return {
        success: false,
        error: error.message,
      }
    }

    if (!data || !data.data) {
      localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())
      return {
        success: true,
        imported: { transcriptions: 0, entries: 0, diaryEntries: 0 },
      }
    }

    // Re-add the version field for import compatibility
    const dataWithVersion = {
      version: '1.0',
      ...data.data
    }

    // Import data
    const jsonData = JSON.stringify(dataWithVersion)
    const result = await importData(jsonData)

    if (result.success) {
      localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())
    }

    return result
  } catch (error: any) {
    console.error('Download error:', error)
    return {
      success: false,
      error: error.message || 'Failed to download from Supabase',
    }
  }
}

/**
 * Get last sync time
 */
export function getSupabaseLastSyncTime(): string | null {
  return localStorage.getItem('supabase_lastSyncTime')
}

async function getSupabaseServerUpdatedAt(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const client = getSupabaseClient()
  const { data, error } = await client
    .from('user_data')
    .select('updated_at')
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data?.updated_at || null
}

export type SupabaseSyncAction = 'upload' | 'download' | 'noop'

export async function syncSupabaseMostRecent(): Promise<{
  success: boolean
  action: SupabaseSyncAction
  error?: string
  imported?: { transcriptions: number; entries: number; diaryEntries: number }
}> {
  try {
    const [localTimestamp, serverTimestamp] = await Promise.all([
      getLocalLatestUpdateTime(),
      getSupabaseServerUpdatedAt(),
    ])

    if (!localTimestamp && !serverTimestamp) {
      localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())
      return { success: true, action: 'noop' }
    }

    if (!serverTimestamp && localTimestamp) {
      const uploadResult = await uploadToSupabase()
      return {
        success: uploadResult.success,
        action: uploadResult.success ? 'upload' : 'noop',
        error: uploadResult.error,
      }
    }

    if (serverTimestamp && !localTimestamp) {
      const downloadResult = await downloadFromSupabase()
      return {
        ...downloadResult,
        action: downloadResult.success ? 'download' : 'noop',
      }
    }

    const localTime = new Date(localTimestamp as string).getTime()
    const serverTime = new Date(serverTimestamp as string).getTime()

    if (localTime >= serverTime) {
      const uploadResult = await uploadToSupabase()
      return {
        success: uploadResult.success,
        action: uploadResult.success ? 'upload' : 'noop',
        error: uploadResult.error,
      }
    }

    const downloadResult = await downloadFromSupabase()
    return {
      ...downloadResult,
      action: downloadResult.success ? 'download' : 'noop',
    }
  } catch (error: any) {
    console.error('Most recent sync error:', error)
    return {
      success: false,
      action: 'noop',
      error: error.message || 'Failed to sync most recent data',
    }
  }
}

export async function pullSupabaseMostRecent(): Promise<{
  success: boolean
  action: SupabaseSyncAction
  error?: string
  imported?: { transcriptions: number; entries: number; diaryEntries: number }
}> {
  try {
    const [localTimestamp, serverTimestamp] = await Promise.all([
      getLocalLatestUpdateTime(),
      getSupabaseServerUpdatedAt(),
    ])

    if (!serverTimestamp && !localTimestamp) {
      localStorage.setItem('supabase_lastSyncTime', new Date().toISOString())
      return { success: true, action: 'noop' }
    }

    if (!serverTimestamp && localTimestamp) {
      const uploadResult = await uploadToSupabase()
      return {
        success: uploadResult.success,
        action: uploadResult.success ? 'upload' : 'noop',
        error: uploadResult.error,
      }
    }

    if (serverTimestamp && !localTimestamp) {
      const downloadResult = await downloadFromSupabase()
      return {
        ...downloadResult,
        action: downloadResult.success ? 'download' : 'noop',
      }
    }

    const localTime = new Date(localTimestamp as string).getTime()
    const serverTime = new Date(serverTimestamp as string).getTime()

    if (serverTime >= localTime) {
      const downloadResult = await downloadFromSupabase()
      return {
        ...downloadResult,
        action: downloadResult.success ? 'download' : 'noop',
      }
    }

    const uploadResult = await uploadToSupabase()
    return {
      success: uploadResult.success,
      action: uploadResult.success ? 'upload' : 'noop',
      error: uploadResult.error,
    }
  } catch (error: any) {
    console.error('Pull latest error:', error)
    return {
      success: false,
      action: 'noop',
      error: error.message || 'Failed to pull latest data',
    }
  }
}

/**
 * Auto-sync with Supabase
 */
let supabaseAutoSyncInterval: number | null = null

export function startSupabaseAutoSync(intervalMinutes: number = 5) {
  // Start real-time subscription for instant sync
  startRealtimeSync()

  // Also keep periodic upload as backup (every 5 minutes)
  if (supabaseAutoSyncInterval) {
    clearInterval(supabaseAutoSyncInterval)
  }

  supabaseAutoSyncInterval = window.setInterval(async () => {
    const authenticated = await isAuthenticated()
    if (authenticated) {
      const result = await uploadToSupabase()
      if (result.success) {
        console.log('Supabase periodic backup sync completed')
      } else {
        console.error('Supabase periodic sync failed:', result.error)
      }
    }
  }, intervalMinutes * 60 * 1000)
}

export function stopSupabaseAutoSync() {
  // Stop real-time sync
  stopRealtimeSync()

  // Stop periodic sync
  if (supabaseAutoSyncInterval) {
    clearInterval(supabaseAutoSyncInterval)
    supabaseAutoSyncInterval = null
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!isSupabaseConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  const client = getSupabaseClient()
  return client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
}

/**
 * Real-Time Sync Functions
 */
let realtimeChannel: any = null

/**
 * Start real-time subscription for instant sync
 */
export async function startRealtimeSync() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping realtime sync')
    return
  }

  const client = getSupabaseClient()
  const user = await getCurrentUser()

  if (!user) {
    console.warn('No user authenticated, skipping realtime sync')
    return
  }

  // Unsubscribe from existing channel if any
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
  }

  console.log('Starting real-time sync for user:', user.email)

  // Subscribe to changes on user_data table
  realtimeChannel = client
    .channel('user_data_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${user.id}`, // Only our data
      },
      async (payload) => {
        console.log('Real-time change detected:', payload.eventType)

        // When server changes, download and merge with local
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          await handleServerChange(payload.new)
        } else if (payload.eventType === 'DELETE') {
          console.warn('Server data deleted')
        }
      }
    )
    .subscribe((status) => {
      console.log('Real-time subscription status:', status)
    })
}

/**
 * Stop real-time subscription
 */
export function stopRealtimeSync() {
  if (realtimeChannel) {
    const client = getSupabaseClient()
    client.removeChannel(realtimeChannel)
    realtimeChannel = null
    console.log('Real-time sync stopped')
  }
}

/**
 * Handle incoming changes from server
 * Merge with local data using timestamp-based resolution
 */
async function handleServerChange(serverData: any) {
  try {
    // Get local updated_at timestamp
    const localUpdatedAt = await getLocalLatestUpdateTime()

    if (!localUpdatedAt) {
      // No local data, just download
      console.log('No local sync time, downloading server data...')
      await downloadFromSupabase()
      return
    }

    // Compare timestamps
    const serverTimestamp = new Date(serverData.updated_at).getTime()
    const localTimestamp = new Date(localUpdatedAt).getTime()

    if (serverTimestamp > localTimestamp) {
      // Server is newer, download and overwrite local
      console.log('Server has newer data, syncing down...')
      await downloadFromSupabase()
    } else {
      // Local is newer or equal, no action needed
      console.log('Local data is up to date')
    }
  } catch (error) {
    console.error('Error handling server change:', error)
  }
}

/**
 * Debounced upload to prevent excessive syncs
 */
let uploadDebounceTimer: number | null = null
const UPLOAD_DEBOUNCE_MS = 2000 // 2 seconds

export function triggerLocalSync() {
  // Clear existing timer
  if (uploadDebounceTimer) {
    clearTimeout(uploadDebounceTimer)
  }

  // Schedule upload after debounce period
  uploadDebounceTimer = window.setTimeout(async () => {
    const authenticated = await isAuthenticated()
    if (authenticated) {
      console.log('Local change detected, uploading to Supabase...')
      await uploadToSupabase()
    }
  }, UPLOAD_DEBOUNCE_MS)
}
