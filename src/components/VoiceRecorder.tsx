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
      // Analyze the text with AI
      const analysis = await aiService.analyzeText(transcript)

      // Map old category to new type
      const entryType = analysis.category === 'journal' ? 'journal' :
                        analysis.category === 'note' ? 'note' :
                        analysis.category === 'todo' ? 'todo' :
                        analysis.category === 'reminder' ? 'reminder' : 'voice'

      // Save to unified entries table
      const entry: Entry = {
        id: crypto.randomUUID(),
        type: entryType,
        source: 'voice',
        content: transcript,
        title: analysis.suggestedTitle || undefined,
        date: analysis.suggestedDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: analysis.tags,
        priority: analysis.priority,
        completed: false,
        processed: true,
      }

      await db.entries.add(entry)

      setSaveSuccess(true)
      setTranscript('')
      if (!useOnlineMode) speechRecognition.resetTranscript()
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save transcription:', error)
      setError('Failed to save transcription')
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
    <div className="space-y-6">
      {/* Online/Offline Mode Toggle */}
      {speechRecognition.isSupported && (
        <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">
            Mode:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setUseOnlineMode(false)
                setSetupWarning(null)
                setError(null)
              }}
              disabled={isRecording}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2',
                !useOnlineMode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                isRecording && 'opacity-50 cursor-not-allowed'
              )}
            >
              <WifiOff className="w-4 h-4" />
              Offline
            </button>
            <button
              onClick={() => {
                setUseOnlineMode(true)
                setSetupWarning(null)
                setError(null)
              }}
              disabled={isRecording}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all text-sm flex items-center gap-2',
                useOnlineMode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                isRecording && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Wifi className="w-4 h-4" />
              Online {groqConfigured && '(Groq)'}
            </button>
          </div>
        </div>
      )}

      {/* Mode Info */}
      <div className="text-center text-xs text-muted-foreground">
        {useOnlineMode ? (
          <span>✨ Online: Lightning-fast, high-accuracy AI transcription (Groq Whisper)</span>
        ) : (
          <span>🔒 Offline: Private browser-based speech recognition</span>
        )}
      </div>

      {/* Setup Warning */}
      {setupWarning && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-200">{setupWarning}</p>
        </div>
      )}

      {/* Recording Button */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <button
            onClick={handleToggleRecording}
            disabled={isTranscribing}
            className={cn(
              'relative w-32 h-32 rounded-full flex items-center justify-center',
              'transition-all duration-300 transform hover:scale-105',
              'focus:outline-none focus:ring-4 focus:ring-primary/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isRecording
                ? 'bg-destructive text-destructive-foreground animate-pulse-slow shadow-lg shadow-destructive/50'
                : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
            )}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isTranscribing ? (
              <Loader2 size={48} className="animate-spin" />
            ) : isRecording ? (
              <MicOff size={48} />
            ) : (
              <Mic size={48} />
            )}
            {isRecording && !isTranscribing && (
              <span className="absolute -bottom-8 text-sm font-medium">
                Recording...
              </span>
            )}
            {isTranscribing && (
              <span className="absolute -bottom-8 text-sm font-medium">
                Transcribing...
              </span>
            )}
          </button>
        </div>

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
          <div className="p-4 bg-muted rounded-lg min-h-32 max-h-64 overflow-y-auto">
            <p className="text-foreground whitespace-pre-wrap">
              {transcript}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleSave}
              disabled={isSaving || isRecording || isTranscribing}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
                'transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handleDiscard}
              disabled={isSaving || isTranscribing}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
                'transition-colors',
                'bg-secondary text-secondary-foreground hover:bg-secondary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <X size={20} />
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
  )
}
