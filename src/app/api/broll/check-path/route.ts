import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json({ exists: false, error: 'Path is required' }, { status: 400 })
    }

    const exists = fs.existsSync(path)
    return NextResponse.json({ exists, path })
  } catch (error) {
    console.error('Error checking path:', error)
    return NextResponse.json({ exists: false, error: 'Failed to check path' }, { status: 500 })
  }
}
