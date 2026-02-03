import { supabase, isSupabaseConfigured } from './supabase'

export interface UploadProgress {
  progress: number
  loaded: number
  total: number
}

export interface VideoUploadResult {
  url: string
  path: string
  size: number
}

export interface VideoProjectRecord {
  id?: string
  shape_id: string
  title: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  source_url: string | null
  output_url: string | null
  thumbnail_url: string | null
  duration: number | null
  metadata: Record<string, unknown>
}

// Generate a unique filename
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || 'mp4'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}.${ext}`
}

// Upload video to Supabase Storage
export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<VideoUploadResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add your credentials to .env.local')
  }

  const fileName = generateFileName(file.name)
  const filePath = `videos/${fileName}`

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          progress: Math.round((event.loaded / event.total) * 100),
          loaded: event.loaded,
          total: event.total,
        })
      }
    })

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Get public URL
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = (supabase as any).storage
          .from('videos')
          .getPublicUrl(filePath)

        resolve({
          url: data.publicUrl,
          path: filePath,
          size: file.size,
        })
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    // Get upload URL from Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any).storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      .then(({ data, error }: { data: { path: string } | null; error: Error | null }) => {
        if (error) {
          reject(error)
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: urlData } = (supabase as any).storage
          .from('videos')
          .getPublicUrl(filePath)

        resolve({
          url: urlData.publicUrl,
          path: filePath,
          size: file.size,
        })
      })
      .catch(reject)
  })
}

// Simple upload without progress (fallback)
export async function uploadVideoSimple(file: File): Promise<VideoUploadResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }

  const fileName = generateFileName(file.name)
  const filePath = `videos/${fileName}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).storage
    .from('videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw error
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: urlData } = (supabase as any).storage
    .from('videos')
    .getPublicUrl(filePath)

  return {
    url: urlData.publicUrl,
    path: filePath,
    size: file.size,
  }
}

// Delete video from storage
export async function deleteVideo(path: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).storage.from('videos').remove([path])
}

// Get video metadata (duration, dimensions) from file
export function getVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }

    video.src = URL.createObjectURL(file)
  })
}

// Save video project to database
export async function saveVideoProject(project: VideoProjectRecord): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('video_projects')
      .upsert({
        shape_id: project.shape_id,
        title: project.title,
        status: project.status,
        source_url: project.source_url,
        output_url: project.output_url,
        thumbnail_url: project.thumbnail_url,
        duration: project.duration,
        metadata: project.metadata,
        user_id: null, // Anonymous for now
      }, {
        onConflict: 'shape_id',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to save video project:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Failed to save video project:', error)
    return null
  }
}

// Update video project status
export async function updateVideoProjectStatus(
  shapeId: string,
  status: VideoProjectRecord['status'],
  updates?: Partial<VideoProjectRecord>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('video_projects')
      .update({
        status,
        ...updates,
      })
      .eq('shape_id', shapeId)
  } catch (error) {
    console.error('Failed to update video project:', error)
  }
}

// Delete video project from database
export async function deleteVideoProject(shapeId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('video_projects')
      .delete()
      .eq('shape_id', shapeId)
  } catch (error) {
    console.error('Failed to delete video project:', error)
  }
}

// Generate thumbnail from video file
export async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration
      video.currentTime = Math.min(1, video.duration * 0.1)
    }

    video.onseeked = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        URL.revokeObjectURL(video.src)
        resolve(dataUrl)
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video'))
    }

    video.src = URL.createObjectURL(file)
  })
}
