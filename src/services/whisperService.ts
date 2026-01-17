import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    console.warn('OpenAI API key not found or not configured. Set VITE_OPENAI_API_KEY in your .env file.')
    return null
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('Invalid OpenAI API key format. Key should start with "sk-"')
    return null
  }

  if (!openai) {
    try {
      openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
        // Note: This may fail due to CORS restrictions
        // Consider using a backend proxy for production
      })
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error)
      return null
    }
  }

  return openai
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const client = getOpenAIClient()

  if (!client) {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.')
  }

  // Retry logic for transient failures
  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Convert blob to File object (Whisper API requires a file)
      const file = new File([audioBlob], 'audio.webm', {
        type: audioBlob.type || 'audio/webm',
      })

      // Call Whisper API
      const response = await client.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en', // Optional: set to 'en' for English, or remove to auto-detect
        response_format: 'text',
      })

      return response as unknown as string
    } catch (error: any) {
      lastError = error
      console.error(`Whisper transcription error (attempt ${attempt}/${maxRetries}):`, error)

      // Don't retry on authentication or rate limit errors
      if (error?.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY.')
      }

      if (error?.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.')
      }

      // Check for CORS or network errors
      if (error?.message?.includes('CORS') ||
          error?.message?.includes('Network') ||
          error?.message?.includes('fetch') ||
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ENOTFOUND' ||
          !error?.status) {

        // Only throw on last attempt
        if (attempt === maxRetries) {
          throw new Error(
            'Connection error: Unable to reach OpenAI API. ' +
            'This may be due to CORS restrictions when calling OpenAI from the browser. ' +
            'Consider using a backend proxy or check your network connection.'
          )
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500))
        continue
      }

      // For other errors, throw immediately
      throw new Error(`Transcription failed: ${error?.message || 'Unknown error'}`)
    }
  }

  // If we get here, all retries failed
  throw new Error(`Connection error after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
}

export function isWhisperConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  return !!(apiKey && apiKey !== 'sk-your-api-key-here' && apiKey.startsWith('sk-'))
}

export async function validateWhisperSetup(): Promise<{ valid: boolean; error?: string }> {
  if (!isWhisperConfigured()) {
    return {
      valid: false,
      error: 'OpenAI API key not configured. Using browser speech recognition instead.'
    }
  }

  // Note: We can't actually test the API key without making a request
  // and the OpenAI API doesn't support CORS for browser requests properly
  return {
    valid: true,
    error: undefined
  }
}
