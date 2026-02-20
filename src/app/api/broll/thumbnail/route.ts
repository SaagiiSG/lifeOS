import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { path: videoPath } = await request.json()

    if (!videoPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Create temp file for thumbnail
    const tempDir = os.tmpdir()
    const thumbnailName = `broll_thumb_${Date.now()}.jpg`
    const thumbnailPath = path.join(tempDir, thumbnailName)

    try {
      // Use FFmpeg to extract a frame at 1 second
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbnailPath}"`,
        { timeout: 10000 }
      )

      // Read the thumbnail and convert to base64
      const thumbnailBuffer = fs.readFileSync(thumbnailPath)
      const base64 = thumbnailBuffer.toString('base64')
      const dataUrl = `data:image/jpeg;base64,${base64}`

      // Clean up temp file
      fs.unlinkSync(thumbnailPath)

      return NextResponse.json({ thumbnail: dataUrl })
    } catch (ffmpegError) {
      console.error('FFmpeg error:', ffmpegError)
      // Clean up temp file if it exists
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }
      return NextResponse.json({ thumbnail: null, error: 'Failed to generate thumbnail' })
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 })
  }
}
