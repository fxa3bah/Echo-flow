import { useEffect, useState } from 'react'
import { Mic, MicOff, Save, X, Loader2 } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { transcribeAudio, isWhisperConfigured } from '../services/whisperService'
import { db } from '../lib/db'
import { aiService } from '../services/aiService'
import type { Transcription } from '../types'
import { cn } from '../lib/utils'

export function VoiceRecorder() {
  const whisperConfigured = isWhisperConfigured()

  // Web Speech API (fallback)
  const speechRecognition = useSpeechRecognition()

  // Whisper API (preferred if configured)
  const audioRecorder = useAudioRecorder()

  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useWhisper, setUseWhisper] = useState(whisperConfigured)

  const isRecording = useWhisper ? audioRecorder.isRecording : speechRecognition.isListening
  const currentError = useWhisper ? audioRecorder.error : speechRecognition.error
  const isSupported = useWhisper ? audioRecorder.isSupported : speechRecognition.isSupported

  // Update transcript from Web Speech API
  useEffect(() => {
    if (!useWhisper && speechRecognition.transcript) {
      setTranscript(speechRecognition.transcript)
    }
  }, [useWhisper, speechRecognition.transcript])

  const handleToggleRecording = async () => {
    setError(null)

    if (isRecording) {
      // Stop recording
      if (useWhisper) {
        setIsTranscribing(true)
        try {
          const audioBlob = await audioRecorder.stopRecording()

          if (audioBlob) {
            // Transcribe with Whisper
            const transcribedText = await transcribeAudio(audioBlob)
            setTranscript(transcribedText)
          }
        } catch (err: any) {
          console.error('Transcription error:', err)
          const errorMessage = err.message || 'Failed to transcribe audio'

          // Check if this is a connection/CORS error and offer fallback
          if (errorMessage.includes('Connection error') || errorMessage.includes('CORS')) {
            setError(
              errorMessage +
              ' Would you like to use browser-based speech recognition instead?'
            )
            // Automatically fallback to Web Speech API
            if (speechRecognition.isSupported) {
              setTimeout(() => {
                setUseWhisper(false)
                setError('Switched to browser-based speech recognition due to connection issues.')
              }, 3000)
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

      if (useWhisper) {
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

      // Save to database
      const transcription: Transcription = {
        id: crypto.randomUUID(),
        text: transcript,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: analysis.category,
        tags: analysis.tags,
        processed: true,
      }

      await db.transcriptions.add(transcription)

      // If AI suggested creating an entry, create it
      if (analysis.category === 'todo' || analysis.category === 'reminder') {
        await db.entries.add({
          id: crypto.randomUUID(),
          type: analysis.category,
          title: analysis.suggestedTitle || transcript.slice(0, 50),
          content: transcript,
          date: analysis.suggestedDate || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: analysis.tags,
          priority: analysis.priority,
          completed: false,
          transcriptionId: transcription.id,
          linkedEntryIds: [],
        })
      }

      setSaveSuccess(true)
      setTranscript('')
      if (!useWhisper) speechRecognition.resetTranscript()
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
    if (!useWhisper) {
      speechRecognition.resetTranscript()
      speechRecognition.stopListening()
    }
  }

  useEffect(() => {
    aiService.checkOllamaAvailability()
  }, [])

  if (!isSupported) {
    return (
      <div className="text-center p-8 bg-destructive/10 rounded-lg">
        <p className="text-destructive">
          {useWhisper
            ? 'Audio recording is not supported in your browser.'
            : 'Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Indicator and Toggle */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        {useWhisper ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Using OpenAI Whisper (High Accuracy Mode)
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-full">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Using Browser Speech Recognition
          </span>
        )}
        {whisperConfigured && speechRecognition.isSupported && !isRecording && (
          <button
            onClick={() => setUseWhisper(!useWhisper)}
            className="text-xs text-primary hover:underline"
          >
            Switch to {useWhisper ? 'Browser Speech Recognition' : 'OpenAI Whisper'}
          </button>
        )}
      </div>

      {/* Recording Button */}
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

      {/* Error Message */}
      {(currentError || error) && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
          {error || currentError}
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
