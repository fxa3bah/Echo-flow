import Dexie, { Table } from 'dexie'
import type { Transcription, Entry, DiaryEntry, Settings, Tag } from '../types'

export class EchoFlowDatabase extends Dexie {
  transcriptions!: Table<Transcription, string>
  entries!: Table<Entry, string>
  diaryEntries!: Table<DiaryEntry, string>
  tags!: Table<Tag, string>
  settings!: Table<Settings, string>

  constructor() {
    super('EchoFlowDB')

    this.version(1).stores({
      transcriptions: 'id, createdAt, category, processed, *tags',
      entries: 'id, type, date, createdAt, *tags, priority, completed',
      diaryEntries: 'id, date, createdAt',
      tags: 'id, name',
      settings: 'id',
    })
  }
}

export const db = new EchoFlowDatabase()

// Initialize default settings
db.on('ready', async () => {
  const existingSettings = await db.settings.get('default')
  if (!existingSettings) {
    await db.settings.add({
      id: 'default',
      theme: 'system',
      language: 'en-US',
      autoDeleteAudio: true,
      enableEmailDigest: false,
    })
  }
})
