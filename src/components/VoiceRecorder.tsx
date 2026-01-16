import { useEffect, useState } from 'react'
import { Mic, MicOff, Save, X } from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { db } from '../lib/db'
import { aiService } from '../services/aiService'
import type { Transcription } from '../types'
import { cn } from '../lib/utils'

export function VoiceRecorder() {
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  } = useSpeechRecognition()

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
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
      resetTranscript()
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save transcription:', error)
      alert('Failed to save transcription')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    resetTranscript()
    stopListening()
  }

  useEffect(() => {
    aiService.checkOllamaAvailability()
  }, [])

  if (!isSupported) {
    return (
      <div className="text-center p-8 bg-destructive/10 rounded-lg">
        <p className="text-destructive">
          Speech recognition is not supported in your browser.
          Please use Chrome, Edge, or Safari.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recording Button */}
      <div className="flex justify-center">
        <button
          onClick={handleToggleRecording}
          className={cn(
            'relative w-32 h-32 rounded-full flex items-center justify-center',
            'transition-all duration-300 transform hover:scale-105',
            'focus:outline-none focus:ring-4 focus:ring-primary/50',
            isListening
              ? 'bg-destructive text-destructive-foreground animate-pulse-slow shadow-lg shadow-destructive/50'
              : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
          )}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? <MicOff size={48} /> : <Mic size={48} />}
          {isListening && (
            <span className="absolute -bottom-8 text-sm font-medium">
              Recording...
            </span>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
          {error}
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
              disabled={isSaving || isListening}
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
              disabled={isSaving}
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
