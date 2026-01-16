import { useEffect, useRef, useState, useCallback } from 'react'

interface SpeechRecognitionHook {
  transcript: string
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  isSupported: boolean
  error: string | null
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any | null>(null)
  const finalTranscriptRef = useRef('')

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser')
      return
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interimTranscript = ''

      // Process only new results starting from resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          // Append final results to the ref (permanent storage)
          finalTranscriptRef.current += transcriptPiece + ' '
        } else {
          // Interim results are temporary
          interimTranscript += transcriptPiece
        }
      }

      // Display: permanent final results + temporary interim results
      setTranscript(finalTranscriptRef.current + interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setError(`Recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isSupported])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      setError(null)
      recognitionRef.current.start()
      setIsListening(true)
    } catch (err) {
      console.error('Error starting recognition:', err)
      setError('Failed to start recording')
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      setIsListening(false)
    } catch (err) {
      console.error('Error stopping recognition:', err)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    finalTranscriptRef.current = ''
  }, [])

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  }
}
