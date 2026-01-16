export type EntryCategory = 'journal' | 'todo' | 'reminder' | 'note'

export type Priority = 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important'

export interface Tag {
  id: string
  name: string
  color?: string
}

export interface Transcription {
  id: string
  text: string
  audioUrl?: string
  createdAt: Date
  updatedAt: Date
  category?: EntryCategory
  tags: string[]
  processed: boolean
  linkedEntryId?: string
}

export interface Entry {
  id: string
  type: EntryCategory
  title: string
  content: string
  date: Date
  createdAt: Date
  updatedAt: Date
  tags: string[]
  priority?: Priority
  completed?: boolean
  dueDate?: Date
  transcriptionId?: string
  linkedEntryIds: string[]
}

export interface DiaryEntry {
  id: string
  date: Date
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  theme: 'light' | 'dark' | 'system'
  language: string
  autoDeleteAudio: boolean
  enableEmailDigest: boolean
  emailDigestTime?: string
  defaultCategory?: EntryCategory
}

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface AIAnalysisResult {
  category: EntryCategory
  tags: string[]
  priority?: Priority
  suggestedDate?: Date
  suggestedTitle?: string
  confidence: number
}
