/**
 * B-Roll Storage and Indexing
 * Handles SSD detection, B-roll scanning, and database sync
 */

import { getSupabase, isSupabaseConfigured } from './supabase'

export interface BrollClip {
  id?: string
  file_path: string
  category: 'timelapse' | 'medium' | 'wide-shot' | 'close-up' | 'random' | 'walking-selfie'
  duration?: number
  thumbnail_url?: string
  keywords?: string[]
  filename: string
}

// Default SSD paths to check (macOS)
const DEFAULT_SSD_PATHS = [
  '/Volumes/ORICO',
  '/Volumes/SSD/broll',
  '/Volumes/SSD',
  '/Volumes/External/broll',
  '/Volumes/External',
  '/Volumes/BROLL',
  '/mnt/ssd/broll',
]

// B-roll category folders
const BROLL_CATEGORIES = [
  'timelapse',
  'medium',
  'wide-shot',
  'close-up',
  'random',
  'walking-selfie',
] as const

/**
 * Check if a path exists (via backend API)
 */
export async function checkPathExists(path: string): Promise<boolean> {
  try {
    const response = await fetch('/api/broll/check-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const data = await response.json()
    return data.exists
  } catch {
    return false
  }
}

/**
 * Detect SSD connection by checking known paths
 */
export async function detectSSD(customPath?: string): Promise<{ connected: boolean; path: string | null }> {
  // Check custom path first
  if (customPath) {
    const exists = await checkPathExists(customPath)
    if (exists) {
      return { connected: true, path: customPath }
    }
  }

  // Check default paths
  for (const path of DEFAULT_SSD_PATHS) {
    const exists = await checkPathExists(path)
    if (exists) {
      return { connected: true, path }
    }
  }

  return { connected: false, path: null }
}

/**
 * Scan SSD for B-roll clips
 */
export async function scanBrollClips(ssdPath: string): Promise<BrollClip[]> {
  try {
    const response = await fetch('/api/broll/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: ssdPath, categories: BROLL_CATEGORIES }),
    })

    if (!response.ok) {
      throw new Error('Failed to scan B-roll clips')
    }

    const data = await response.json()
    return data.clips
  } catch (error) {
    console.error('Failed to scan B-roll clips:', error)
    return []
  }
}

/**
 * Generate thumbnail for a video file
 */
export async function generateBrollThumbnail(filePath: string): Promise<string | null> {
  try {
    const response = await fetch('/api/broll/thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.thumbnail
  } catch {
    return null
  }
}

/**
 * Save B-roll clips to database
 */
export async function saveBrollClipsToDatabase(clips: BrollClip[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping B-roll database sync')
    return
  }

  const supabase = getSupabase()
  if (!supabase) return

  try {
    // Insert clips one by one
    for (const clip of clips) {
      // First try to find existing
      const { data: existing } = await supabase
        .from('broll_clips')
        .select('id')
        .eq('file_path', clip.file_path)
        .single()

      if (existing) {
        // Update existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('broll_clips') as any)
          .update({
            category: clip.category,
            duration: clip.duration || null,
            thumbnail_url: clip.thumbnail_url || null,
            keywords: clip.keywords || [],
            filename: clip.filename,
          })
          .eq('file_path', clip.file_path)
      } else {
        // Insert new
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('broll_clips') as any)
          .insert({
            file_path: clip.file_path,
            category: clip.category,
            duration: clip.duration || null,
            thumbnail_url: clip.thumbnail_url || null,
            keywords: clip.keywords || [],
            filename: clip.filename,
          })
      }
    }
  } catch (error) {
    console.error('Failed to save B-roll clips to database:', error)
    throw error
  }
}

/**
 * Get B-roll clips from database
 */
export async function getBrollClipsFromDatabase(): Promise<BrollClip[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('broll_clips')
      .select('*')
      .order('category', { ascending: true })
      .order('filename', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to get B-roll clips from database:', error)
    return []
  }
}

/**
 * Get B-roll clips by category
 */
export async function getBrollClipsByCategory(category: string): Promise<BrollClip[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('broll_clips')
      .select('*')
      .eq('category', category)
      .order('filename', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to get B-roll clips by category:', error)
    return []
  }
}

/**
 * Search B-roll clips by keywords
 */
export async function searchBrollClips(query: string): Promise<BrollClip[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('broll_clips')
      .select('*')
      .or(`filename.ilike.%${query}%,keywords.cs.{${query}}`)
      .order('filename', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to search B-roll clips:', error)
    return []
  }
}

/**
 * Delete all B-roll clips from database (for re-scanning)
 */
export async function clearBrollClipsFromDatabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase
      .from('broll_clips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) throw error
  } catch (error) {
    console.error('Failed to clear B-roll clips from database:', error)
    throw error
  }
}

/**
 * Get video file URL for playback (file:// protocol for local files)
 */
export function getBrollVideoUrl(filePath: string): string {
  // For local files, we need to serve them through an API route
  return `/api/broll/video?path=${encodeURIComponent(filePath)}`
}

/**
 * Extract keywords from filename
 */
export function extractKeywordsFromFilename(filename: string): string[] {
  // Remove extension and split by common separators
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  const words = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map(word => word.toLowerCase())
    .filter(word => word.length > 2)

  return [...new Set(words)]
}

/**
 * Determine category from folder path or filename
 */
export function determineCategory(filePath: string): BrollClip['category'] {
  const lowerPath = filePath.toLowerCase()

  for (const category of BROLL_CATEGORIES) {
    if (lowerPath.includes(category.replace('-', ''))) {
      return category
    }
  }

  // Check for specific keywords
  if (lowerPath.includes('timelapse') || lowerPath.includes('time-lapse')) return 'timelapse'
  if (lowerPath.includes('wide')) return 'wide-shot'
  if (lowerPath.includes('closeup') || lowerPath.includes('close')) return 'close-up'
  if (lowerPath.includes('walk') || lowerPath.includes('selfie')) return 'walking-selfie'
  if (lowerPath.includes('med')) return 'medium'

  return 'random'
}
