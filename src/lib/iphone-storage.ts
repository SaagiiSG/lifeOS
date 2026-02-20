/**
 * iPhone & Local Media Import
 * Detects connected iPhones and scans import folder for media.
 *
 * Workflow: AirDrop or drag files from iPhone/Finder/Image Capture
 * into ~/Movies/LifeOS-Import/, then the app scans that folder.
 */

export interface IphoneMedia {
  file_path: string
  filename: string
  type: 'video' | 'image'
  size: number
  modified: string
}

export interface IphoneStatus {
  connected: boolean
  name: string | null
}

/**
 * Detect if an iPhone is connected via USB
 */
export async function detectIphone(): Promise<IphoneStatus> {
  try {
    const response = await fetch('/api/iphone?action=detect')
    if (!response.ok) return { connected: false, name: null }
    return response.json()
  } catch {
    return { connected: false, name: null }
  }
}

/**
 * Browse iPhone status and get message
 */
export async function browseIphone(): Promise<IphoneStatus & { message: string }> {
  try {
    const response = await fetch('/api/iphone?action=browse')
    if (!response.ok) return { connected: false, name: null, message: 'Failed to check iPhone' }
    return response.json()
  } catch {
    return { connected: false, name: null, message: 'Failed to connect' }
  }
}

/**
 * Scan a local path for media files (after user selects from file picker)
 */
export async function scanMediaPath(path: string): Promise<{
  files: IphoneMedia[]
  count: number
  videos: number
  images: number
}> {
  try {
    const response = await fetch(`/api/iphone?action=scan-path&path=${encodeURIComponent(path)}`)
    if (!response.ok) return { files: [], count: 0, videos: 0, images: 0 }
    return response.json()
  } catch {
    return { files: [], count: 0, videos: 0, images: 0 }
  }
}

/**
 * Copy a media file to local temp storage
 */
export async function copyMediaFile(
  sourcePath: string,
  destinationDir?: string
): Promise<{ success: boolean; path?: string; filename?: string; error?: string }> {
  try {
    const response = await fetch('/api/iphone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'copy',
        sourcePath,
        destinationDir,
      }),
    })
    return response.json()
  } catch {
    return { success: false, error: 'Failed to copy file' }
  }
}

/**
 * Scan the import folder (~/Movies/LifeOS-Import/) for media files.
 * This is the main way to get iPhone media into the app:
 * AirDrop or drag files into this folder from Finder/Image Capture.
 */
export async function scanImportFolder(): Promise<{
  files: IphoneMedia[]
  count: number
  videos: number
  images: number
  importPath: string
}> {
  try {
    const response = await fetch('/api/iphone?action=scan-import')
    if (!response.ok) return { files: [], count: 0, videos: 0, images: 0, importPath: '' }
    return response.json()
  } catch {
    return { files: [], count: 0, videos: 0, images: 0, importPath: '' }
  }
}

/**
 * Open the import folder in Finder (macOS)
 */
export async function openImportFolder(): Promise<boolean> {
  try {
    const response = await fetch('/api/iphone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open-folder' }),
    })
    const data = await response.json()
    return data.success
  } catch {
    return false
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
