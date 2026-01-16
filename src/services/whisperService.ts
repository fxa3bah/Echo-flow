import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    console.warn('OpenAI API key not found. Set VITE_OPENAI_API_KEY in your .env file.')
    return null
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    })
  }

  return openai
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const client = getOpenAIClient()

  if (!client) {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.')
  }

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
    console.error('Whisper transcription error:', error)

    if (error?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY.')
    }

    if (error?.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.')
    }

    throw new Error(`Transcription failed: ${error?.message || 'Unknown error'}`)
  }
}

export function isWhisperConfigured(): boolean {
  const hasKey = !!import.meta.env.VITE_OPENAI_API_KEY
  console.log('🔍 Whisper API Check:', {
    configured: hasKey,
    keyPresent: hasKey ? 'YES - Whisper will be used' : 'NO - Using Web Speech API',
    keyPrefix: hasKey ? import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 8) + '...' : 'Not set'
  })
  return hasKey
}
