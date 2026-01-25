import { useEffect, useState } from 'react'
import { Mic, MicOff, Save, X, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { transcribeWithGroq, isGroqConfigured, validateGroqSetup } from '../services/groqService'
import { db } from '../lib/db'
import { aiService } from '../services/aiService'
import type { Entry } from '../types'
import { cn } from '../lib/utils'

export function VoiceRecorder() {
  const groqConfigured = isGroqConfigured()

  // Offline mode: Web Speech API (browser-based)
  const speechRecognition = useSpeechRecognition()

  // Online mode: Audio recorder for Groq Whisper API
  const audioRecorder = useAudioRecorder()

  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useOnlineMode, setUseOnlineMode] = useState(groqConfigured)
  const [setupWarning, setSetupWarning] = useState<string | null>(null)

  const isRecording = useOnlineMode ? audioRecorder.isRecording : speechRecognition.isListening
  const currentError = useOnlineMode ? audioRecorder.error : speechRecognition.error
  const isSupported = useOnlineMode ? audioRecorder.isSupported : speechRecognition.isSupported

  // Update transcript from Web Speech API (offline mode)
  useEffect(() => {
    if (!useOnlineMode && speechRecognition.transcript) {
      setTranscript(speechRecognition.transcript)
    }
  }, [useOnlineMode, speechRecognition.transcript])

  const handleToggleRecording = async () => {
    setError(null)

    if (isRecording) {
      // Stop recording
      if (useOnlineMode) {
        setIsTranscribing(true)
        try {
          const audioBlob = await audioRecorder.stopRecording()

          if (audioBlob) {
            // Transcribe with Groq Whisper API (online mode)
            const transcribedText = await transcribeWithGroq(audioBlob)
            setTranscript(transcribedText)
          }
        } catch (err: any) {
          console.error('Transcription error:', err)
          const errorMessage = err.message || 'Failed to transcribe audio'

          // Check if this is a connection error and offer fallback
          if (errorMessage.includes('Connection error') ||
            errorMessage.includes('API key not configured')) {

            // Automatically fallback to offline mode
            if (speechRecognition.isSupported) {
              setUseOnlineMode(false)
              setError(
                'Online transcription unavailable (connection error or missing API key). ' +
                'Switched to Offline mode. To use Online mode, add VITE_GROQ_API_KEY to your environment.'
              )
              setSetupWarning(
                'Note: Online mode requires a Groq API key. Get one free at https://console.groq.com'
              )
            } else {
              setError(
                errorMessage +
                ' Browser speech recognition is also not available. Please check your setup.'
              )
            }
          } else {
            setError(errorMessage)
          }
        } finally {
          setIsTranscribing(false)
        }
      } else {
        speechRecognition.stopListening()
      }
    } else {
      // Start recording
      setTranscript('')

      if (useOnlineMode) {
        await audioRecorder.startRecording()
      } else {
        speechRecognition.resetTranscript()
        speechRecognition.startListening()
      }
    }
  }

  const handleSave = async () => {
    if (!transcript.trim()) return

    setIsSaving(true)
    try {
      // Use Groq AI for intelligent parsing (same as AI Chat)
      const { getAIInsights } = await import('../services/groqChatService')
      const { applyAIActions } = await import('../services/aiActions')

      console.log('[VoiceRecorder] Sending to Groq AI:', transcript)

      const insight = await getAIInsights(transcript, [], '')

      console.log('[VoiceRecorder] AI returned actions:', insight.actions)

      if (insight.actions && insight.actions.length > 0) {
        // Apply actions using the same logic as AI Chat
        await applyAIActions(insight.actions)
        console.log(`[VoiceRecorder] Created ${insight.actions.length} action(s) from voice input`)
      } else {
        // Fallback: create a single voice entry if no actions extracted
        console.log('[VoiceRecorder] No actions extracted, creating voice entry')
        const entry: Entry = {
          id: crypto.randomUUID(),
          type: 'voice',
          source: 'voice',
          content: transcript,
          title: transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''),
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          completed: false,
          processed: true,
        }
        await db.entries.add(entry)
      }

      setSaveSuccess(true)
      setTranscript('')
      if (!useOnlineMode) speechRecognition.resetTranscript()
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save transcription:', error)
      setError('Failed to save transcription. Make sure VITE_GROQ_API_KEY is configured.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    setTranscript('')
    setError(null)
    if (!useOnlineMode) {
      speechRecognition.resetTranscript()
      speechRecognition.stopListening()
    }
  }

  useEffect(() => {
    aiService.checkOllamaAvailability()

    // Validate Groq setup on mount
    if (groqConfigured) {
      validateGroqSetup().then((result) => {
        if (!result.valid && result.error) {
          setSetupWarning(result.error)
          setUseOnlineMode(false)
        }
      })
    }
  }, [groqConfigured])

  if (!isSupported) {
    return (
      <div className="text-center p-8 bg-destructive/10 rounded-lg">
        <p className="text-destructive">
          {useOnlineMode
            ? 'Audio recording is not supported in your browser.'
            : 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-700">
        {/* Mode Toggle - Synced with Card Tabs */}
        {speechRecognition.isSupported && (
          <div className="flex justify-center px-4">
            <div className="flex items-center gap-1 bg-card/40 backdrop-blur-md p-1.5 rounded-[24px] border border-border/40 shadow-sm ring-1 ring-black/5 dark:ring-white/5 w-full max-w-sm">
              <button
                onClick={() => {
                  setUseOnlineMode(false)
                  setSetupWarning(null)
                  setError(null)
                }}
                disabled={isRecording}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  !useOnlineMode
                    ? 'bg-background text-primary shadow-sm border border-border/20'
                    : 'text-muted-foreground hover:bg-muted/30',
                  isRecording && 'opacity-50'
                )}
              >
                <WifiOff size={14} />
                <span>Offline</span>
              </button>
              <button
                onClick={() => {
                  setUseOnlineMode(true)
                  setSetupWarning(null)
                  setError(null)
                }}
                disabled={isRecording}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  useOnlineMode
                    ? 'bg-background text-primary shadow-sm border border-border/20'
                    : 'text-muted-foreground hover:bg-muted/30',
                  isRecording && 'opacity-50'
                )}
              >
                <Wifi size={14} />
                <span>Online</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode Status Pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.3)]", useOnlineMode ? "bg-primary" : "bg-muted-foreground/40")} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">
              {useOnlineMode ? "Groq Intelligence Active" : "Private Boundary Mode"}
            </span>
          </div>
        </div>

        {/* Setup Warning */}
        {setupWarning && (
          <div className="mx-auto max-w-md p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-600 dark:text-yellow-200/60 font-medium leading-relaxed">{setupWarning}</p>
          </div>
        )}

        {/* Recording Core */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Pulse Effect Layers */}
            {isRecording && (
              <>
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping duration-[3s]" />
                <div className="absolute inset-[-8px] bg-primary/10 rounded-full animate-ping duration-[2s]" />
              </>
            )}

            <button
              onClick={handleToggleRecording}
              disabled={isTranscribing}
              className={cn(
                'relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-700',
                'hover:scale-[1.02] active:scale-95 shadow-2xl',
                isRecording
                  ? 'bg-destructive text-white shadow-destructive/40 ring-[12px] ring-destructive/10'
                  : 'bg-background border border-border shadow-black/5 dark:shadow-white/5 ring-[12px] ring-muted/20'
              )}
            >
              {isTranscribing ? (
                <Loader2 size={48} className="animate-spin text-primary opacity-50" />
              ) : isRecording ? (
                <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                  <MicOff size={48} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Recording</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 group-hover:text-primary transition-colors">
                  <Mic size={48} className="opacity-80 group-hover:opacity-100" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Tap to Capture</span>
                </div>
              )}

              {/* Inner Glow for Recording */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              )}
            </button>
          </div>

          {/* Process Indicator */}
          {isTranscribing && (
            <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full border border-border/20 backdrop-blur-sm animate-in slide-in-from-bottom-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Decoding Waveform</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {(currentError || error) && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg space-y-3">
            <p className="text-center">{error || currentError}</p>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg min-h-32 max-h-64 overflow-y-auto">
              <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap">
                {transcript}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center px-2 sm:px-0">
              <button
                onClick={handleSave}
                disabled={isSaving || isRecording || isTranscribing}
                className={cn(
                  'flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium min-h-[44px]',
                  'transition-colors text-sm sm:text-base',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Save size={18} className="sm:w-5 sm:h-5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>

              <button
                onClick={handleDiscard}
                disabled={isSaving || isTranscribing}
                className={cn(
                  'flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium min-h-[44px]',
                  'transition-colors text-sm sm:text-base',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-center font-medium animate-in fade-in">
            Saved successfully!
          </div>
        )}
      </div>
    </div>
  )
}
