import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface BrollClip {
  file_path: string
  category: string
  filename: string
  keywords: string[]
  duration?: number
}

interface AudioFile {
  file_path: string
  filename: string
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg']

function extractKeywordsFromFilename(filename: string): string[] {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  const words = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map(word => word.toLowerCase())
    .filter(word => word.length > 2)

  return [...new Set(words)]
}

function determineCategory(filePath: string): string {
  const lowerPath = filePath.toLowerCase()

  if (lowerPath.includes('timelapse') || lowerPath.includes('time-lapse')) return 'timelapse'
  if (lowerPath.includes('wide-shot') || lowerPath.includes('wideshot') || lowerPath.includes('wide')) return 'wide-shot'
  if (lowerPath.includes('close-up') || lowerPath.includes('closeup') || lowerPath.includes('close')) return 'close-up'
  if (lowerPath.includes('walking-selfie') || lowerPath.includes('walk') || lowerPath.includes('selfie')) return 'walking-selfie'
  if (lowerPath.includes('medium') || lowerPath.includes('med')) return 'medium'

  return 'random'
}

function scanDirectory(dirPath: string, clips: BrollClip[], audioFiles: AudioFile[]): void {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)

      if (item.isDirectory()) {
        scanDirectory(fullPath, clips, audioFiles)
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase()
        if (VIDEO_EXTENSIONS.includes(ext)) {
          clips.push({
            file_path: fullPath,
            category: determineCategory(fullPath),
            filename: item.name,
            keywords: extractKeywordsFromFilename(item.name),
          })
        } else if (AUDIO_EXTENSIONS.includes(ext)) {
          audioFiles.push({
            file_path: fullPath,
            filename: item.name,
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path: ssdPath } = await request.json()

    if (!ssdPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (!fs.existsSync(ssdPath)) {
      return NextResponse.json({ error: 'Path does not exist', clips: [] }, { status: 404 })
    }

    const clips: BrollClip[] = []
    const audioFiles: AudioFile[] = []
    scanDirectory(ssdPath, clips, audioFiles)

    return NextResponse.json({
      clips,
      count: clips.length,
      categories: {
        timelapse: clips.filter(c => c.category === 'timelapse').length,
        medium: clips.filter(c => c.category === 'medium').length,
        'wide-shot': clips.filter(c => c.category === 'wide-shot').length,
        'close-up': clips.filter(c => c.category === 'close-up').length,
        random: clips.filter(c => c.category === 'random').length,
        'walking-selfie': clips.filter(c => c.category === 'walking-selfie').length,
      },
      audioFiles,
      audioCount: audioFiles.length,
    })
  } catch (error) {
    console.error('Error scanning B-roll clips:', error)
    return NextResponse.json({ error: 'Failed to scan B-roll clips', clips: [] }, { status: 500 })
  }
}
