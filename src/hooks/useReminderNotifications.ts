import { useEffect, useRef } from 'react'
import { db } from '../lib/db'
import type { Entry } from '../types'

const NOTIFIED_STORAGE_KEY = 'echo-flow-notified-reminders'

type NotifiedMap = Record<string, number>

const loadNotified = (): NotifiedMap => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = window.localStorage.getItem(NOTIFIED_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as NotifiedMap) : {}
  } catch {
    return {}
  }
}

const saveNotified = (notified: NotifiedMap) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(notified))
}

const formatReminderTime = (date: Date) =>
  date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const notifyReminder = (entry: Entry) => {
  const title = entry.title?.trim() || 'Reminder'
  const body = `${entry.content}\nDue: ${formatReminderTime(entry.date)}`
  new Notification(title, {
    body,
    tag: entry.id,
  })
}

const getDueReminders = async (now: Date) =>
  db.entries
    .where('type')
    .equals('reminder')
    .and((entry) => entry.date <= now && !entry.completed)
    .toArray()

export const useReminderNotifications = () => {
  const notifiedRef = useRef<NotifiedMap>({})

  useEffect(() => {
    notifiedRef.current = loadNotified()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return undefined
    }

    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    const checkReminders = async () => {
      if (Notification.permission !== 'granted') {
        return
      }

      const now = new Date()
      const reminders = await getDueReminders(now)

      const nextNotified: NotifiedMap = { ...notifiedRef.current }
      const activeIds = new Set(reminders.map((entry) => entry.id))

      for (const entry of reminders) {
        const updatedAt = entry.updatedAt?.getTime() ?? entry.date.getTime()
        const notifiedAt = nextNotified[entry.id]
        if (!notifiedAt || updatedAt > notifiedAt) {
          notifyReminder(entry)
          nextNotified[entry.id] = updatedAt
        }
      }

      for (const [id] of Object.entries(nextNotified)) {
        if (!activeIds.has(id)) {
          delete nextNotified[id]
        }
      }

      notifiedRef.current = nextNotified
      saveNotified(nextNotified)
    }

    void checkReminders()
    const intervalId = window.setInterval(checkReminders, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])
}
