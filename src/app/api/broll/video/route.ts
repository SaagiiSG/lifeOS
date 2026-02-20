import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    // Security check: ensure path is within allowed directories
    const resolvedPath = path.resolve(filePath)

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get file stats
    const stats = fs.statSync(resolvedPath)
    const fileSize = stats.size

    // Get range header for video streaming
    const range = request.headers.get('range')

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      // Create read stream for the range
      const stream = fs.createReadStream(resolvedPath, { start, end })

      // Convert Node stream to Web stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(Buffer.from(chunk)))
          })
          stream.on('end', () => {
            controller.close()
          })
          stream.on('error', (err) => {
            controller.error(err)
          })
        },
        cancel() {
          stream.destroy()
        },
      })

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': getContentType(resolvedPath),
        },
      })
    } else {
      // Stream entire file
      const stream = fs.createReadStream(resolvedPath)

      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(Buffer.from(chunk)))
          })
          stream.on('end', () => {
            controller.close()
          })
          stream.on('error', (err) => {
            controller.error(err)
          })
        },
        cancel() {
          stream.destroy()
        },
      })

      return new NextResponse(webStream, {
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': getContentType(resolvedPath),
          'Accept-Ranges': 'bytes',
        },
      })
    }
  } catch (error) {
    console.error('Error serving video:', error)
    return NextResponse.json({ error: 'Failed to serve video' }, { status: 500 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
  }
  return types[ext] || 'video/mp4'
}
