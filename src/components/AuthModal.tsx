import { useState } from 'react'
import { X, Mail, Lock, Loader2 } from 'lucide-react'
import { signInWithEmail, signUpWithEmail } from '../services/supabaseSync'
import { cn } from '../lib/utils'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      let result
      if (mode === 'signup') {
        result = await signUpWithEmail(email, password)
      } else {
        result = await signInWithEmail(email, password)
      }

      if (result.success) {
        setSuccess(mode === 'signup' ? 'Account created! Signing in...' : 'Signed in successfully!')
        setTimeout(() => {
          onAuthSuccess()
          onClose()
        }, 1000)
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
    setSuccess(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  'w-full pl-10 pr-4 py-2 rounded-lg',
                  'bg-background border border-border',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  'transition-all'
                )}
                disabled={loading}
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
                  'w-full pl-10 pr-4 py-2 rounded-lg',
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

          {success && (
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-3 rounded-lg font-medium',
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

          <div className="text-center">
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

          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground text-center">
              Your account will be active immediately - no email confirmation needed!
            </p>
          )}
        </form>

        {/* Info */}
        <div className="px-6 pb-6 pt-0">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Supabase Cloud Sync</strong>
              <br />
              Your data is encrypted and synced across all your devices automatically.
              Free tier includes 500MB storage!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
