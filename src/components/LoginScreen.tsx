import { useState } from 'react'
import { Mail, Lock, Loader2, Database } from 'lucide-react'
import { signInWithEmail, signUpWithEmail } from '../services/supabaseSync'
import { cn } from '../lib/utils'

interface LoginScreenProps {
  onLoginSuccess: () => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let result
      if (mode === 'signup') {
        result = await signUpWithEmail(email, password)
      } else {
        result = await signInWithEmail(email, password)
      }

      if (result.success) {
        // Success! Parent will handle showing main app
        onLoginSuccess()
      } else {
        setError(result.error || 'Authentication failed')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Database className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Echo Flow</h1>
          <p className="text-muted-foreground">
            Voice-first productivity with real-time cloud sync
          </p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-background border border-border',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    'transition-all'
                  )}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                  minLength={6}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-background border border-border',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    'transition-all'
                  )}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-3 rounded-lg font-medium text-lg',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'transition-colors disabled:opacity-50',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {mode === 'signin' ? (
                  <>
                    Don't have an account? <span className="font-medium text-primary">Sign up</span>
                  </>
                ) : (
                  <>
                    Already have an account? <span className="font-medium text-primary">Sign in</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border">
              Your account will be active immediately - no email confirmation needed!
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 space-y-2 text-center text-sm text-muted-foreground">
          <p>✨ Real-time sync across all devices</p>
          <p>🔒 Secure cloud storage with Supabase</p>
          <p>📱 Works on mobile and desktop</p>
        </div>
      </div>
    </div>
  )
}
