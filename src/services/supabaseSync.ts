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
import { exportAllData, importData } from './dataSync'

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
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY &&
    SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '')
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

    // Auto-sync data after signup
    await uploadToSupabase()

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

    // Auto-sync data after login
    await downloadFromSupabase()

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
    const data = JSON.parse(jsonData)

    // Upsert to user_data table
    const { error } = await client
      .from('user_data')
      .upsert({
        user_id: user.id,
        data: data,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      return {
        success: false,
        error: error.message,
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
      return {
        success: true,
        imported: { transcriptions: 0, entries: 0, diaryEntries: 0 },
      }
    }

    // Import data
    const jsonData = JSON.stringify(data.data)
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

/**
 * Auto-sync with Supabase
 */
let supabaseAutoSyncInterval: number | null = null

export function startSupabaseAutoSync(intervalMinutes: number = 5) {
  if (supabaseAutoSyncInterval) {
    clearInterval(supabaseAutoSyncInterval)
  }

  supabaseAutoSyncInterval = window.setInterval(async () => {
    const authenticated = await isAuthenticated()
    if (authenticated) {
      const result = await uploadToSupabase()
      if (result.success) {
        console.log('Supabase auto-sync completed')
      } else {
        console.error('Supabase auto-sync failed:', result.error)
      }
    }
  }, intervalMinutes * 60 * 1000)
}

export function stopSupabaseAutoSync() {
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
