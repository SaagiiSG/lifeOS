import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif']
const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]

// Import folder where users AirDrop clips they want to use as B-roll
const IMPORT_FOLDER = path.join(process.env.HOME || '/tmp', 'Documents', 'b-roll')

interface IphoneMedia {
  file_path: string
  filename: string
  type: 'video' | 'image'
  size: number
  modified: string
}

function detectIphoneUSB(): { connected: boolean; name: string | null } {
  try {
    const output = execSync('system_profiler SPUSBDataType -json', {
      timeout: 10000,
      encoding: 'utf-8',
    })

    const data = JSON.parse(output)
    const usbItems = data?.SPUSBDataType || []

    // Recursively search for iPhone in USB tree
    function findIphone(items: unknown[]): string | null {
      for (const item of items) {
        const entry = item as Record<string, unknown>
        const name = (entry._name as string) || ''
        if (name.toLowerCase().includes('iphone')) {
          return name
        }
        // Check nested items (USB hubs)
        if (entry._items && Array.isArray(entry._items)) {
          const found = findIphone(entry._items as unknown[])
          if (found) return found
        }
      }
      return null
    }

    const iphoneName = findIphone(usbItems)
    return { connected: !!iphoneName, name: iphoneName }
  } catch {
    return { connected: false, name: null }
  }
}

function scanMediaFiles(dirPath: string, files: IphoneMedia[], maxDepth: number = 5, currentDepth: number = 0): void {
  if (currentDepth > maxDepth) return

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const item of items) {
      if (item.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, item.name)

      if (item.isDirectory()) {
        scanMediaFiles(fullPath, files, maxDepth, currentDepth + 1)
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase()
        if (MEDIA_EXTENSIONS.includes(ext)) {
          const stats = fs.statSync(fullPath)
          files.push({
            file_path: fullPath,
            filename: item.name,
            type: VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image',
            size: stats.size,
            modified: stats.mtime.toISOString(),
          })
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'detect') {
    const result = detectIphoneUSB()
    return NextResponse.json(result)
  }

  if (action === 'browse') {
    // Check if iPhone is connected and list its media
    // On macOS, connected iPhones with Image Capture support
    // appear via PTP protocol. We detect and let user use file picker.
    const result = detectIphoneUSB()
    return NextResponse.json({
      ...result,
      message: result.connected
        ? 'iPhone detected. Use the Import button to select media from your iPhone.'
        : 'No iPhone detected. Connect your iPhone via USB cable.',
    })
  }

  if (action === 'scan-import') {
    // Scan the import folder for media files
    // Create if it doesn't exist
    if (!fs.existsSync(IMPORT_FOLDER)) {
      fs.mkdirSync(IMPORT_FOLDER, { recursive: true })
    }

    const files: IphoneMedia[] = []
    scanMediaFiles(IMPORT_FOLDER, files)

    return NextResponse.json({
      files: files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
      count: files.length,
      videos: files.filter(f => f.type === 'video').length,
      images: files.filter(f => f.type === 'image').length,
      importPath: IMPORT_FOLDER,
    })
  }

  if (action === 'scan-path') {
    // Scan a specific local path for media
    const scanPath = searchParams.get('path')
    if (!scanPath || !fs.existsSync(scanPath)) {
      return NextResponse.json({ error: 'Invalid path', files: [] }, { status: 400 })
    }

    const files: IphoneMedia[] = []
    scanMediaFiles(scanPath, files)

    return NextResponse.json({
      files: files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
      count: files.length,
      videos: files.filter(f => f.type === 'video').length,
      images: files.filter(f => f.type === 'image').length,
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use: detect, browse, scan-import, scan-path' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'open-folder') {
      // Open the import folder in Finder
      if (!fs.existsSync(IMPORT_FOLDER)) {
        fs.mkdirSync(IMPORT_FOLDER, { recursive: true })
      }
      try {
        execSync(`open "${IMPORT_FOLDER}"`, { timeout: 5000 })
        return NextResponse.json({ success: true, path: IMPORT_FOLDER })
      } catch {
        return NextResponse.json({ success: false, error: 'Failed to open folder' }, { status: 500 })
      }
    }

    if (action === 'copy') {
      // Copy a file from source path to a local temp directory
      const { sourcePath, destinationDir } = body

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        return NextResponse.json({ error: 'Source file not found' }, { status: 404 })
      }

      const destDir = destinationDir || '/tmp/lifeos-iphone-import'
      fs.mkdirSync(destDir, { recursive: true })

      const filename = path.basename(sourcePath)
      const destPath = path.join(destDir, filename)

      fs.copyFileSync(sourcePath, destPath)

      return NextResponse.json({
        success: true,
        path: destPath,
        filename,
        size: fs.statSync(destPath).size,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('iPhone API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
