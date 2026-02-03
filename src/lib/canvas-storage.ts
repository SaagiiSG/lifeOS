import { supabase, isSupabaseConfigured } from './supabase'

const LOCAL_STORAGE_KEY = 'lifeos-canvas'
const CANVAS_ID_KEY = 'lifeos-canvas-id'

// Using a generic type for tldraw snapshots to avoid version-specific type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CanvasSnapshot = any

interface CanvasRecord {
  id: string
  name: string
  document: CanvasSnapshot
  updated_at: string
}

// Get or create a canvas ID for anonymous users
function getLocalCanvasId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(CANVAS_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CANVAS_ID_KEY, id)
  }
  return id
}

export async function loadCanvas(): Promise<CanvasSnapshot | null> {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const canvasId = getLocalCanvasId()
      if (!canvasId) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('canvas')
        .select('document')
        .eq('id', canvasId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase load error:', error)
      }

      if (data?.document) {
        return data.document as CanvasSnapshot
      }
    } catch (error) {
      console.error('Failed to load from Supabase:', error)
    }
  }

  // Fallback to localStorage
  try {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as CanvasSnapshot
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
  }

  return null
}

export async function saveCanvas(snapshot: CanvasSnapshot): Promise<boolean> {
  // Always save to localStorage as backup
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }

  // Save to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const canvasId = getLocalCanvasId()
      if (!canvasId) return false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('canvas')
        .upsert({
          id: canvasId,
          name: 'My Canvas',
          document: snapshot,
          user_id: null, // Anonymous for now
        }, {
          onConflict: 'id',
        })

      if (error) {
        console.error('Supabase save error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to save to Supabase:', error)
      return false
    }
  }

  return true
}

// Subscribe to realtime changes
export function subscribeToCanvas(
  onUpdate: (snapshot: CanvasSnapshot) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {}
  }

  const canvasId = getLocalCanvasId()
  if (!canvasId) return () => {}

  const channel = supabase
    .channel('canvas-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'canvas',
        filter: `id=eq.${canvasId}`,
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

// Check storage status
export function getStorageStatus(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local'
}
