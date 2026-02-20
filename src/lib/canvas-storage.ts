import { supabase, isSupabaseConfigured } from './supabase'

const LOCAL_STORAGE_KEY = 'lifeos-canvas'
const CANVAS_ID_KEY = 'lifeos-canvas-id'
const IDB_DB_NAME = 'lifeos-canvas-db'
const IDB_STORE_NAME = 'snapshots'
const IDB_VERSION = 1
const MAX_BACKUPS = 3

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CanvasSnapshot = any

// Track shape count from last successful load to prevent saving empty canvas over real data
let lastKnownShapeCount = 0

function countShapes(snapshot: CanvasSnapshot): number {
  try {
    const store = snapshot?.document?.store || snapshot?.store || {}
    return Object.keys(store).filter(k => k.startsWith('shape:')).length
  } catch {
    return 0
  }
}

/** Whether the last loadCanvas() succeeded. Used by Canvas.tsx to gate saves. */
export let canvasLoadSucceeded = false

/** Whether the last loadCanvas() was a genuinely new (empty) canvas vs a failure. */
export let canvasIsNew = false

// =============================================
// IndexedDB — rolling backup storage
// =============================================

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(key: string, value: CanvasSnapshot): Promise<void> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite')
      const store = tx.objectStore(IDB_STORE_NAME)
      store.put({ key, snapshot: value, savedAt: Date.now() })
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch (err) {
    console.warn('[LifeOS IDB] Failed to write:', err)
  }
}

async function idbGet(key: string): Promise<{ snapshot: CanvasSnapshot; savedAt: number } | null> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly')
      const store = tx.objectStore(IDB_STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => {
        db.close()
        resolve(request.result ?? null)
      }
      request.onerror = () => {
        db.close()
        reject(request.error)
      }
    })
  } catch (err) {
    console.warn('[LifeOS IDB] Failed to read:', err)
    return null
  }
}

/**
 * Save snapshot to IndexedDB with rolling backups.
 * Slots: "current", "backup-1", "backup-2"
 * Before writing "current", rotate: backup-2 = backup-1, backup-1 = old current
 */
async function saveToIDB(snapshot: CanvasSnapshot): Promise<void> {
  try {
    // Rotate backups: shift current -> backup-1 -> backup-2
    for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
      const srcKey = i === 1 ? 'current' : `backup-${i - 1}`
      const dstKey = `backup-${i}`
      const src = await idbGet(srcKey)
      if (src) {
        await idbPut(dstKey, src.snapshot)
      }
    }
    // Write new current
    await idbPut('current', snapshot)
  } catch (err) {
    console.warn('[LifeOS IDB] Backup rotation failed:', err)
    // Still try to write current even if rotation failed
    try {
      await idbPut('current', snapshot)
    } catch {
      // silently fail — localStorage and Supabase are the other layers
    }
  }
}

/**
 * Load the best available snapshot from IndexedDB.
 * Tries: current -> backup-1 -> backup-2
 * Returns the one with the most shapes (in case current is corrupted/empty).
 */
async function loadFromIDB(): Promise<CanvasSnapshot | null> {
  try {
    const keys = ['current', 'backup-1', 'backup-2']
    let best: { snapshot: CanvasSnapshot; shapes: number; savedAt: number } | null = null

    for (const key of keys) {
      const entry = await idbGet(key)
      if (entry?.snapshot) {
        const shapes = countShapes(entry.snapshot)
        if (!best || shapes > best.shapes || (shapes === best.shapes && entry.savedAt > best.savedAt)) {
          best = { snapshot: entry.snapshot, shapes, savedAt: entry.savedAt }
        }
      }
    }

    if (best) {
      const age = Date.now() - best.savedAt
      const ageStr = age < 60000 ? `${Math.round(age / 1000)}s ago` :
        age < 3600000 ? `${Math.round(age / 60000)}m ago` :
        `${Math.round(age / 3600000)}h ago`
      console.log(`[LifeOS IDB] Best backup: ${best.shapes} shapes, saved ${ageStr}`)
      return best.snapshot
    }
  } catch (err) {
    console.warn('[LifeOS IDB] Failed to load:', err)
  }
  return null
}

// =============================================
// Database table recovery
// =============================================

async function recoverFromDatabase(): Promise<{
  goals: unknown[]
  habits: unknown[]
  tasks: unknown[]
} | null> {
  if (!isSupabaseConfigured()) return null

  try {
    const [goalsRes, habitsRes, tasksRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('goals').select('*'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('habits').select('*'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('tasks').select('*'),
    ])

    const goals = goalsRes.data || []
    const habits = habitsRes.data || []
    const tasks = tasksRes.data || []

    if (goals.length === 0 && habits.length === 0 && tasks.length === 0) {
      return null
    }

    console.log(
      `[LifeOS Recovery] Found ${goals.length} goals, ${habits.length} habits, ${tasks.length} tasks in database`
    )
    return { goals, habits, tasks }
  } catch (error) {
    console.error('[LifeOS Recovery] Failed to recover from database:', error)
    return null
  }
}

// =============================================
// Data export
// =============================================

export async function exportAllData(): Promise<object | null> {
  if (!isSupabaseConfigured()) return null

  try {
    const [goalsRes, habitsRes, tasksRes, canvasRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('goals').select('*'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('habits').select('*'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('tasks').select('*'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('canvas').select('id, name, updated_at').limit(1).single(),
    ])

    return {
      exportedAt: new Date().toISOString(),
      goals: goalsRes.data || [],
      habits: habitsRes.data || [],
      tasks: tasksRes.data || [],
      canvasMeta: canvasRes.data || null,
    }
  } catch (error) {
    console.error('Failed to export data:', error)
    return null
  }
}

export async function downloadDataExport(): Promise<void> {
  const data = await exportAllData()
  if (!data) {
    console.error('No data to export')
    return
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =============================================
// Supabase helpers
// =============================================

interface CanvasRecord {
  id: string
  name: string
  document: CanvasSnapshot
  updated_at: string
  user_id?: string
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user?.id) return session.user.id

    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

function getLocalCanvasId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(CANVAS_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CANVAS_ID_KEY, id)
  }
  return id
}

export function clearCanvasCache(): void {
  cachedUserCanvasId = null
}

let cachedUserCanvasId: string | null = null

async function getUserCanvasId(userId: string): Promise<string | null> {
  if (cachedUserCanvasId) return cachedUserCanvasId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('canvas')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user canvas ID:', error)
  }

  if (data?.id) {
    cachedUserCanvasId = data.id
    return data.id
  }

  return null
}

function loadLocalSnapshot(): CanvasSnapshot | null {
  try {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!saved) return null
    return JSON.parse(saved) as CanvasSnapshot
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

async function loadAnonymousSupabaseCanvas(): Promise<CanvasSnapshot | null> {
  const canvasId = getLocalCanvasId()
  if (!canvasId) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('canvas')
    .select('document')
    .eq('id', canvasId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase load (anonymous) error:', error)
  }

  return (data?.document as CanvasSnapshot) ?? null
}

async function seedUserCanvasFromSnapshot(
  userId: string,
  snapshot: CanvasSnapshot
): Promise<void> {
  try {
    const existingCanvasId = await getUserCanvasId(userId)
    if (existingCanvasId) return

    const newCanvasId = crypto.randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('canvas')
      .insert({
        id: newCanvasId,
        name: 'My Canvas',
        document: snapshot,
        user_id: userId,
      })

    if (error) {
      console.error('Supabase seed user canvas error:', error)
      return
    }

    cachedUserCanvasId = newCanvasId
  } catch (error) {
    console.error('Failed to seed user canvas:', error)
  }
}

// =============================================
// Load — tries every layer, picks the best
// =============================================

export async function loadCanvas(): Promise<CanvasSnapshot | null> {
  canvasLoadSucceeded = false
  canvasIsNew = false

  const markSuccess = (snapshot: CanvasSnapshot, source: string) => {
    lastKnownShapeCount = countShapes(snapshot)
    canvasLoadSucceeded = true
    console.log(`[LifeOS] Canvas loaded from ${source} (${lastKnownShapeCount} shapes)`)
    // Also write to IDB so local backup is up-to-date
    saveToIDB(snapshot).catch(() => {})
    return snapshot
  }

  // 1. Try Supabase (source of truth for authenticated users)
  if (isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId()

      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('canvas')
          .select('id, document')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Supabase load error:', error)
        }

        if (data?.document) {
          cachedUserCanvasId = data.id
          return markSuccess(data.document as CanvasSnapshot, 'Supabase')
        }

        // No Supabase canvas — try local sources then seed to Supabase
        const idb = await loadFromIDB()
        if (idb) {
          await seedUserCanvasFromSnapshot(userId, idb)
          return markSuccess(idb, 'IndexedDB (seeded to Supabase)')
        }

        const local = loadLocalSnapshot()
        if (local) {
          await seedUserCanvasFromSnapshot(userId, local)
          return markSuccess(local, 'localStorage (seeded to Supabase)')
        }

        const anon = await loadAnonymousSupabaseCanvas()
        if (anon) {
          await seedUserCanvasFromSnapshot(userId, anon)
          return markSuccess(anon, 'Supabase anonymous (seeded)')
        }

        // Genuinely new user
        canvasIsNew = true
        canvasLoadSucceeded = true
        console.log('[LifeOS] New user — no existing canvas found')
        return null
      } else {
        // Anonymous user
        const anon = await loadAnonymousSupabaseCanvas()
        if (anon) return markSuccess(anon, 'Supabase (anonymous)')
      }
    } catch (error) {
      console.error('Failed to load from Supabase:', error)
      console.warn('[LifeOS] Supabase failed. Trying local backups...')
      // Fall through to local backups
    }
  }

  // 2. Try IndexedDB (has rolling backups, picks best by shape count)
  const idb = await loadFromIDB()
  if (idb) return markSuccess(idb, 'IndexedDB')

  // 3. Try localStorage (legacy fallback)
  const localSnapshot = loadLocalSnapshot()
  if (localSnapshot) return markSuccess(localSnapshot, 'localStorage')

  // 4. Nothing found — check DB tables for orphaned data
  if (!canvasLoadSucceeded) {
    const recovered = await recoverFromDatabase()
    if (recovered && (recovered.goals.length > 0 || recovered.habits.length > 0 || recovered.tasks.length > 0)) {
      console.warn(`[LifeOS] Canvas blob lost but found data in DB tables. Auto-save BLOCKED.`)
      return null
    }

    // Truly empty
    canvasIsNew = true
    canvasLoadSucceeded = true
  }

  return null
}

export { recoverFromDatabase }

// =============================================
// Save — writes to all layers
// =============================================

export async function saveCanvas(snapshot: CanvasSnapshot): Promise<boolean> {
  // Safety: don't overwrite a populated canvas with an empty one
  const newShapeCount = countShapes(snapshot)
  if (newShapeCount === 0 && lastKnownShapeCount > 5) {
    console.warn(`[LifeOS] BLOCKED: Attempted to save empty canvas (0 shapes) over populated one (${lastKnownShapeCount} shapes)`)
    return false
  }

  lastKnownShapeCount = newShapeCount

  // Layer 1: IndexedDB (rolling backups, no size limit)
  await saveToIDB(snapshot)

  // Layer 2: localStorage (legacy backup, may hit size limit)
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch (error) {
    // localStorage full — not critical, IDB has it
    console.warn('[LifeOS] localStorage full, using IndexedDB only for local backup')
  }

  // Layer 3: Supabase (cloud persistence)
  if (isSupabaseConfigured()) {
    const payloadSize = new Blob([JSON.stringify(snapshot)]).size
    if (payloadSize > 8 * 1024 * 1024) {
      console.warn(`[LifeOS] Canvas snapshot is ${(payloadSize / 1024 / 1024).toFixed(1)}MB — too large for Supabase. Saved locally only.`)
      return true
    }

    try {
      const userId = await getCurrentUserId()

      if (userId) {
        const existingCanvasId = await getUserCanvasId(userId)

        if (existingCanvasId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('canvas')
            .update({ document: snapshot })
            .eq('id', existingCanvasId)

          if (error) {
            console.error('[LifeOS] Supabase update error:', error)
            return false
          }
        } else {
          const newCanvasId = crypto.randomUUID()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('canvas')
            .insert({
              id: newCanvasId,
              name: 'My Canvas',
              document: snapshot,
              user_id: userId,
            })

          if (error) {
            console.error('[LifeOS] Supabase insert error:', error)
            return false
          }

          cachedUserCanvasId = newCanvasId
        }
      } else {
        // Anonymous user
        const canvasId = getLocalCanvasId()
        if (!canvasId) return false

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('canvas')
          .upsert(
            {
              id: canvasId,
              name: 'My Canvas',
              document: snapshot,
              user_id: null,
            },
            { onConflict: 'id' }
          )

        if (error) {
          console.error('[LifeOS] Supabase save error:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('[LifeOS] Failed to save to Supabase:', error)
      return false
    }
  }

  return true
}

// =============================================
// Realtime subscription
// =============================================

export async function subscribeToCanvas(
  onUpdate: (snapshot: CanvasSnapshot) => void
): Promise<() => void> {
  if (!isSupabaseConfigured()) {
    return () => {}
  }

  const userId = await getCurrentUserId()

  let filterField: string
  let filterValue: string

  if (userId) {
    const userCanvasId = await getUserCanvasId(userId)
    if (!userCanvasId) return () => {}
    filterField = 'id'
    filterValue = userCanvasId
  } else {
    const canvasId = getLocalCanvasId()
    if (!canvasId) return () => {}
    filterField = 'id'
    filterValue = canvasId
  }

  const channel = supabase
    .channel('canvas-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'canvas',
        filter: `${filterField}=eq.${filterValue}`,
      },
      (payload) => {
        const newDoc = payload.new as CanvasRecord
        if (newDoc?.document) {
          onUpdate(newDoc.document)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// =============================================
// Utilities
// =============================================

export function getStorageStatus(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local'
}
