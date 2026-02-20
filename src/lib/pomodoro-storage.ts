export interface PomodoroSession {
  id: string
  timestamp: string
  mode: 'deep-work' | 'hormozi-sprint'
  duration: number // seconds
  sentence: string // what was accomplished (Hormozi mode)
}

const STORAGE_KEY = 'lifeos-pomodoro-sessions'

function getSessions(): PomodoroSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setSessions(sessions: PomodoroSession[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function savePomodoroSession(session: Omit<PomodoroSession, 'id'>): PomodoroSession {
  const sessions = getSessions()
  const newSession: PomodoroSession = {
    ...session,
    id: `pom-${Date.now()}`,
  }
  sessions.push(newSession)
  setSessions(sessions)
  return newSession
}

export function getTodaySessions(): PomodoroSession[] {
  const sessions = getSessions()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return sessions.filter(s => s.timestamp.startsWith(todayStr))
}

export function getAllSessions(): PomodoroSession[] {
  return getSessions()
}
