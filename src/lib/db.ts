import Dexie, { Table } from 'dexie'
import type { Transcription, Entry, DiaryEntry, Settings, Tag } from '../types'

export class EchoFlowDatabase extends Dexie {
  // Legacy tables (v1) - deprecated
  transcriptions!: Table<Transcription, string>
  diaryEntries!: Table<DiaryEntry, string>

  // NEW: Unified table (v2)
  entries!: Table<Entry, string>

  // Shared tables
  tags!: Table<Tag, string>
  settings!: Table<Settings, string>

  constructor() {
    super('EchoFlowDB')

    // Version 1 - Original schema (deprecated)
    this.version(1).stores({
      transcriptions: 'id, createdAt, category, processed, *tags',
      entries: 'id, type, date, createdAt, *tags, priority, completed',
      diaryEntries: 'id, date, createdAt',
      tags: 'id, name',
      settings: 'id',
    })

    // Version 2 - UNIFIED SCHEMA (Single source of truth)
    this.version(2).stores({
      // Unified entries table - ALL data in one place
      entries: 'id, type, source, date, createdAt, *tags, priority, completed, processed',

      // Keep legacy tables for migration
      transcriptions: 'id, createdAt, category, processed, *tags',
      diaryEntries: 'id, date, createdAt',

      // Shared tables
      tags: 'id, name',
      settings: 'id',
    }).upgrade(async (trans) => {
      console.log('🔄 Migrating to unified schema (v2)...')

      // Migrate transcriptions to unified entries table
      const transcriptions = await trans.table('transcriptions').toArray()
      console.log(`Migrating ${transcriptions.length} transcriptions...`)

      for (const t of transcriptions) {
        await trans.table('entries').add({
          id: t.id,
          type: 'voice' as const,
          source: 'voice' as const,
          content: t.text,
          title: undefined,
          date: t.createdAt,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          tags: t.tags || [],
          completed: false,
          processed: t.processed,
          audioUrl: t.audioUrl,
          linkedEntryIds: t.linkedEntryId ? [t.linkedEntryId] : [],
        })
      }

      // Migrate old entries (todos/reminders/notes) to unified table
      const oldEntries = await trans.table('entries').toArray()
      console.log(`Migrating ${oldEntries.length} entries...`)

      // Clear the entries table first
      await trans.table('entries').clear()

      // Re-add with new schema
      for (const e of oldEntries as any[]) {
        await trans.table('entries').add({
          id: e.id,
          type: e.type as any,
          source: 'ai-chat' as const,
          content: e.content,
          title: e.title,
          date: e.date,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          tags: e.tags || [],
          priority: e.priority,
          completed: e.completed || false,
          processed: true, // Already processed
          linkedEntryIds: e.linkedEntryIds || [],
        })
      }

      // Migrate diary entries to unified table
      const diaryEntries = await trans.table('diaryEntries').toArray()
      console.log(`Migrating ${diaryEntries.length} diary entries...`)

      for (const d of diaryEntries) {
        await trans.table('entries').add({
          id: d.id,
          type: 'diary' as const,
          source: 'diary' as const,
          content: d.content,
          title: `Daily Notes - ${d.date.toLocaleDateString()}`,
          date: d.date,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          tags: [],
          completed: false,
          processed: true,
          linkedEntryIds: [],
        })
      }

      console.log('✅ Migration complete!')
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
