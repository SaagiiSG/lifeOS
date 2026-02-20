/**
 * Video Processor Client
 * Calls the video processing backend API
 */

// Configure the video processor URL
// In production, this would be the deployed service URL (Railway, Render, etc.)
const VIDEO_PROCESSOR_URL = process.env.NEXT_PUBLIC_VIDEO_PROCESSOR_URL || 'http://localhost:8000'

export interface ProcessingOptions {
  noise_threshold?: string  // e.g., "-30dB"
  min_silence_duration?: number  // seconds
  whisper_model?: 'tiny' | 'base' | 'small' | 'medium' | 'large'
}

export interface ProcessingJob {
  job_id: string
  status: 'pending' | 'downloading' | 'removing_silence' | 'generating_captions' | 'compositing' | 'encoding' | 'uploading' | 'completed' | 'failed'
  progress: number
  message: string
  result?: {
    output_url?: string
    output_file?: string
    silence_removal?: {
      silence_removed: number
      original_duration: number
      new_duration: number
      reduction_percent: number
    }
    captions?: {
      success: boolean
      language: string
      segment_count: number
      urls?: {
        english_srt?: string
        mongolian_srt?: string
        transcript_json?: string
      }
    }
    export?: {
      success: boolean
      duration: number
      resolution: string
      file_size: number
      file_size_mb: number
      segments_count: number
      broll_count: number
      captions_burned: boolean
    }
  }
}

export interface ExportData {
  videoUrl: string
  shapeId: string
  brollOverlays: { start: number; end: number; clip_file_path: string }[]
  englishCaptions: { start: number; end: number; text: string }[]
  mongolianCaptions: { start: number; end: number; text: string }[]
  captionSettings: {
    english_y: number
    mongolian_y: number
    show_shadow: boolean
    burn_captions: boolean
  }
  exportSettings: {
    resolution: 'source' | '1080' | '4k'
  }
  bgMusicPath?: string
  volumeSettings?: {
    main_volume: number
    bg_music_volume: number
  }
}

/**
 * Start video processing
 */
export async function startVideoProcessing(
  videoUrl: string,
  shapeId: string,
  options: ProcessingOptions = {}
): Promise<{ job_id: string; status: string; message: string }> {
  const response = await fetch(`${VIDEO_PROCESSOR_URL}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      shape_id: shapeId,
      options,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to start processing: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get processing job status
 */
export async function getProcessingStatus(jobId: string): Promise<ProcessingJob> {
  const response = await fetch(`${VIDEO_PROCESSOR_URL}/status/${jobId}`)

  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Poll for job completion
 */
export async function pollProcessingStatus(
  jobId: string,
  onProgress?: (job: ProcessingJob) => void,
  pollInterval: number = 2000,
  maxAttempts: number = 300  // 10 minutes max
): Promise<ProcessingJob> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const job = await getProcessingStatus(jobId)

    if (onProgress) {
      onProgress(job)
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return job
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
    attempts++
  }

  throw new Error('Processing timed out')
}

/**
 * Start video export with B-roll and captions
 */
export async function startVideoExport(
  data: ExportData
): Promise<{ job_id: string; status: string; message: string }> {
  const response = await fetch(`${VIDEO_PROCESSOR_URL}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: data.videoUrl,
      shape_id: data.shapeId,
      broll_overlays: data.brollOverlays,
      english_captions: data.englishCaptions,
      mongolian_captions: data.mongolianCaptions,
      caption_settings: data.captionSettings,
      export_settings: data.exportSettings,
      bg_music_path: data.bgMusicPath,
      volume_settings: data.volumeSettings,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to start export: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Check if the video processor service is available
 */
export async function isProcessorAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${VIDEO_PROCESSOR_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}
