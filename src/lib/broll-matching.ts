/**
 * AI B-Roll Matching
 * Uses GPT/Claude to analyze transcript and suggest B-roll clips
 */

import { type BrollClip } from './broll-storage'

export interface TranscriptSegment {
  start: number  // seconds
  end: number    // seconds
  text: string
}

export interface BrollOverlay {
  id: string
  start: number      // seconds
  end: number        // seconds
  clip: BrollClip
  confidence: number // 0-1, how confident the AI is in this match
}

/**
 * Parse SRT file to transcript segments
 */
export function parseSrtToSegments(srtContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  const blocks = srtContent.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    // Parse timestamp line (format: 00:00:01,000 --> 00:00:04,000)
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )

    if (!timeMatch) continue

    const start = parseTimestamp(timeMatch.slice(1, 5))
    const end = parseTimestamp(timeMatch.slice(5, 9))
    const text = lines.slice(2).join(' ').trim()

    if (text) {
      segments.push({ start, end, text })
    }
  }

  return segments
}

function parseTimestamp(parts: string[]): number {
  const [hours, minutes, seconds, ms] = parts.map(Number)
  return hours * 3600 + minutes * 60 + seconds + ms / 1000
}

/**
 * Group segments into chunks for B-roll matching (3-5 seconds each)
 */
export function groupSegmentsIntoChunks(
  segments: TranscriptSegment[],
  chunkDuration: number = 4
): TranscriptSegment[] {
  if (segments.length === 0) return []

  const chunks: TranscriptSegment[] = []
  let currentChunk: TranscriptSegment | null = null

  for (const segment of segments) {
    if (!currentChunk) {
      currentChunk = { ...segment }
    } else if (segment.end - currentChunk.start <= chunkDuration) {
      // Merge into current chunk
      currentChunk.end = segment.end
      currentChunk.text += ' ' + segment.text
    } else {
      // Save current chunk and start new one
      chunks.push(currentChunk)
      currentChunk = { ...segment }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Extract keywords from text for matching
 */
export function extractKeywords(text: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', "it's", 'we', 'you',
    'they', 'them', 'their', 'our', 'your', 'my', 'his', 'her', 'i', 'me',
    'so', 'if', 'then', 'than', 'when', 'where', 'how', 'what', 'which',
    'who', 'why', "let's", 'lets', 'get', 'got', 'going', 'go', 'come',
    'just', 'now', 'here', 'there', 'very', 'really', 'actually', 'basically',
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}

/**
 * Score how well a clip matches a transcript segment
 */
function scoreClipMatch(clip: BrollClip, keywords: string[]): number {
  let score = 0

  const clipKeywords = new Set([
    ...(clip.keywords || []).map(k => k.toLowerCase()),
    ...clip.filename.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/),
    clip.category.toLowerCase().replace('-', ' ').split(' '),
  ].flat())

  // Score based on keyword matches
  for (const keyword of keywords) {
    for (const clipKeyword of clipKeywords) {
      if (clipKeyword.includes(keyword) || keyword.includes(clipKeyword)) {
        score += 1
      }
    }
  }

  // Category-based scoring for common educational content
  const educationKeywords = ['equation', 'math', 'solve', 'calculate', 'number', 'formula', 'graph']
  const hasEducationKeyword = keywords.some(k => educationKeywords.some(ek => k.includes(ek)))

  if (hasEducationKeyword) {
    if (clip.category === 'close-up') score += 2  // Writing, calculator shots
    if (clip.category === 'medium') score += 1   // Studying shots
  }

  return score
}

/**
 * Match B-roll clips to transcript segments using keyword matching
 * (Fallback when AI is not available)
 */
export function matchBrollToSegments(
  segments: TranscriptSegment[],
  availableClips: BrollClip[]
): BrollOverlay[] {
  if (availableClips.length === 0) return []

  const overlays: BrollOverlay[] = []
  const usedClips = new Set<string>()

  for (const segment of segments) {
    const keywords = extractKeywords(segment.text)

    // Score all available clips
    const scoredClips = availableClips
      .filter(clip => !usedClips.has(clip.file_path))
      .map(clip => ({
        clip,
        score: scoreClipMatch(clip, keywords),
      }))
      .sort((a, b) => b.score - a.score)

    // Get best match or random
    let bestMatch = scoredClips[0]

    if (!bestMatch || bestMatch.score === 0) {
      // Use random clip
      const randomClips = availableClips.filter(
        c => c.category === 'random' && !usedClips.has(c.file_path)
      )
      if (randomClips.length > 0) {
        bestMatch = { clip: randomClips[Math.floor(Math.random() * randomClips.length)], score: 0 }
      } else {
        // Use any available clip
        const anyClip = availableClips.find(c => !usedClips.has(c.file_path))
        if (anyClip) {
          bestMatch = { clip: anyClip, score: 0 }
        }
      }
    }

    if (bestMatch) {
      usedClips.add(bestMatch.clip.file_path)
      overlays.push({
        id: `overlay-${overlays.length}`,
        start: segment.start,
        end: segment.end,
        clip: bestMatch.clip,
        confidence: Math.min(bestMatch.score / 5, 1), // Normalize to 0-1
      })

      // Reset used clips if we've used most of them
      if (usedClips.size > availableClips.length * 0.8) {
        usedClips.clear()
      }
    }
  }

  return overlays
}

/**
 * Match B-roll using AI (Claude/GPT)
 */
export async function matchBrollWithAI(
  segments: TranscriptSegment[],
  availableClips: BrollClip[],
  apiKey?: string
): Promise<BrollOverlay[]> {
  // If no API key, fall back to keyword matching
  if (!apiKey) {
    console.log('No AI API key provided, using keyword matching')
    return matchBrollToSegments(segments, availableClips)
  }

  try {
    const response = await fetch('/api/broll/ai-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments,
        clips: availableClips.map(c => ({
          file_path: c.file_path,
          filename: c.filename,
          category: c.category,
          keywords: c.keywords,
        })),
      }),
    })

    if (!response.ok) {
      throw new Error('AI matching failed')
    }

    const data = await response.json()

    // Map AI response back to full clip objects
    return data.overlays.map((overlay: { start: number; end: number; clip_path: string; confidence: number }, index: number) => {
      const clip = availableClips.find(c => c.file_path === overlay.clip_path)
      return {
        id: `overlay-${index}`,
        start: overlay.start,
        end: overlay.end,
        clip: clip || availableClips[0],
        confidence: overlay.confidence,
      }
    })
  } catch (error) {
    console.error('AI matching failed, falling back to keyword matching:', error)
    return matchBrollToSegments(segments, availableClips)
  }
}

/**
 * Generate continuous B-roll coverage
 * Ensures no gaps between B-roll overlays
 */
export function ensureContinuousCoverage(
  overlays: BrollOverlay[],
  videoDuration: number
): BrollOverlay[] {
  if (overlays.length === 0) return []

  const sortedOverlays = [...overlays].sort((a, b) => a.start - b.start)
  const result: BrollOverlay[] = []

  let currentTime = 0

  for (const overlay of sortedOverlays) {
    // Fill gap if there is one
    if (overlay.start > currentTime && result.length > 0) {
      const lastOverlay = result[result.length - 1]
      lastOverlay.end = overlay.start
    }

    result.push({ ...overlay })
    currentTime = overlay.end
  }

  // Extend last overlay to video end if needed
  if (result.length > 0 && currentTime < videoDuration) {
    result[result.length - 1].end = videoDuration
  }

  return result
}
