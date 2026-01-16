import { db } from './db'

export async function exportAllData() {
  const transcriptions = await db.transcriptions.toArray()
  const entries = await db.entries.toArray()
  const diaryEntries = await db.diaryEntries.toArray()
  const tags = await db.tags.toArray()
  const settings = await db.settings.toArray()

  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    transcriptions,
    entries,
    diaryEntries,
    tags,
    settings,
  }

  return data
}

export async function exportAsJSON() {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, 'echo-flow-export.json', 'application/json')
}

export async function exportAsText() {
  const transcriptions = await db.transcriptions.orderBy('createdAt').toArray()
  const entries = await db.entries.orderBy('createdAt').toArray()
  const diaryEntries = await db.diaryEntries.orderBy('date').toArray()

  let text = '# Echo Flow Export\n\n'
  text += `Export Date: ${new Date().toLocaleDateString()}\n\n`

  text += '## Transcriptions\n\n'
  for (const t of transcriptions) {
    text += `### ${new Date(t.createdAt).toLocaleString()}\n`
    text += `Category: ${t.category || 'Unknown'}\n`
    text += `Tags: ${t.tags.join(', ')}\n`
    text += `\n${t.text}\n\n---\n\n`
  }

  text += '## Entries\n\n'
  for (const e of entries) {
    text += `### ${e.title}\n`
    text += `Type: ${e.type}\n`
    text += `Date: ${new Date(e.date).toLocaleDateString()}\n`
    text += `Tags: ${e.tags.join(', ')}\n`
    if (e.priority) text += `Priority: ${e.priority}\n`
    if (e.completed !== undefined) text += `Completed: ${e.completed ? 'Yes' : 'No'}\n`
    text += `\n${e.content}\n\n---\n\n`
  }

  text += '## Diary Entries\n\n'
  for (const d of diaryEntries) {
    text += `### ${new Date(d.date).toLocaleDateString()}\n`
    text += `\n${d.content}\n\n---\n\n`
  }

  downloadFile(text, 'echo-flow-export.txt', 'text/plain')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function importFromJSON(jsonString: string) {
  try {
    const data = JSON.parse(jsonString)

    if (data.transcriptions) {
      await db.transcriptions.bulkPut(data.transcriptions)
    }
    if (data.entries) {
      await db.entries.bulkPut(data.entries)
    }
    if (data.diaryEntries) {
      await db.diaryEntries.bulkPut(data.diaryEntries)
    }
    if (data.tags) {
      await db.tags.bulkPut(data.tags)
    }

    return { success: true, message: 'Data imported successfully' }
  } catch (error) {
    console.error('Import error:', error)
    return { success: false, message: 'Failed to import data' }
  }
}
