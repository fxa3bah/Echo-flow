import { create } from 'zustand'

interface AppState {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  currentTranscript: string
  setCurrentTranscript: (transcript: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  currentTranscript: '',
  setCurrentTranscript: (transcript) => set({ currentTranscript: transcript }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedTags: [],
  setSelectedTags: (tags) => set({ selectedTags: tags }),
}))
