// Groq Whisper API Service - Fast, free, and accurate transcription

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

export async function transcribeWithGroq(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey || apiKey === 'your-groq-api-key-here') {
    throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your environment variables.')
  }

  // Retry logic for transient failures
  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Convert blob to File object
      const file = new File([audioBlob], 'audio.webm', {
        type: audioBlob.type || 'audio/webm',
      })

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model', 'whisper-large-v3')
      formData.append('language', 'en')
      formData.append('response_format', 'text')

      // Call Groq API
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()

        if (response.status === 401) {
          throw new Error('Invalid Groq API key. Please check your VITE_GROQ_API_KEY.')
        }

        if (response.status === 429) {
          throw new Error('Groq rate limit exceeded. Please try again in a moment.')
        }

        throw new Error(`Groq API error: ${response.status} - ${errorText}`)
      }

      const transcription = await response.text()
      return transcription.trim()

    } catch (error: any) {
      lastError = error
      console.error(`Groq transcription error (attempt ${attempt}/${maxRetries}):`, error)

      // Don't retry on authentication or rate limit errors
      if (error?.message?.includes('Invalid Groq API key') ||
          error?.message?.includes('rate limit')) {
        throw error
      }

      // Check for network errors
      if (error?.message?.includes('fetch') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ENOTFOUND' ||
          error instanceof TypeError) {

        // Only throw on last attempt
        if (attempt === maxRetries) {
          throw new Error(
            'Connection error: Unable to reach Groq API. Please check your internet connection.'
          )
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500))
        continue
      }

      // For other errors, throw immediately
      throw error
    }
  }

  // If we get here, all retries failed
  throw new Error(`Connection error after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
}

export function isGroqConfigured(): boolean {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  return !!apiKey && apiKey !== 'your-groq-api-key-here'
}

export async function validateGroqSetup(): Promise<{ valid: boolean; error?: string }> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey || apiKey === 'your-groq-api-key-here') {
    return {
      valid: false,
      error: 'Groq API key not configured. Add VITE_GROQ_API_KEY to use online transcription.',
    }
  }

  if (!apiKey.startsWith('gsk_')) {
    return {
      valid: false,
      error: 'Invalid Groq API key format. Key should start with "gsk_"',
    }
  }

  return { valid: true }
}
