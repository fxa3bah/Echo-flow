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
    recognition.interimResults = true  // Enable interim results for better capture
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = finalTranscriptRef.current

      // Process both interim and final results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
          finalTranscriptRef.current = finalTranscript
        } else {
          interimTranscript += transcript
        }
      }

      // Update display with final + interim results
      setTranscript(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)

      let errorMessage = 'Recognition error'
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error: Please check your internet connection and try again.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.'
          break
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.'
          setIsListening(false)
          return // Don't show error for no speech
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone and try again.'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service is not available. Try using OpenAI Whisper instead.'
          break
        default:
          errorMessage = `Recognition error: ${event.error}`
      }

      setError(errorMessage)
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

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return

    try {
      setError(null)

      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (permError: any) {
        console.error('Microphone permission error:', permError)
        if (permError.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.')
        } else if (permError.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError('Failed to access microphone. Please check your browser permissions.')
        }
        return
      }

      recognitionRef.current.start()
      setIsListening(true)
    } catch (err: any) {
      console.error('Error starting recognition:', err)
      if (err.message && err.message.includes('already started')) {
        // Recognition is already running, just update state
        setIsListening(true)
      } else {
        setError('Failed to start recording. Please refresh the page and try again.')
      }
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
