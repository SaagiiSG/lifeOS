import { NextRequest, NextResponse } from 'next/server'

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

interface ClipInfo {
  file_path: string
  filename: string
  category: string
  keywords?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { segments, clips } = await request.json() as {
      segments: TranscriptSegment[]
      clips: ClipInfo[]
    }

    if (!segments || !clips) {
      return NextResponse.json({ error: 'Segments and clips are required' }, { status: 400 })
    }

    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!openaiKey && !anthropicKey) {
      return NextResponse.json(
        { error: 'No AI API key configured', overlays: [] },
        { status: 400 }
      )
    }

    // Build prompt for AI
    const clipSummary = clips.map(c =>
      `- ${c.filename} (${c.category}): ${c.keywords?.join(', ') || 'no keywords'}`
    ).join('\n')

    const segmentSummary = segments.map((s, i) =>
      `${i + 1}. [${formatTime(s.start)} - ${formatTime(s.end)}]: "${s.text}"`
    ).join('\n')

    const prompt = `You are a video editor assistant. Given transcript segments and available B-roll clips, suggest the best B-roll for each segment.

AVAILABLE B-ROLL CLIPS:
${clipSummary}

TRANSCRIPT SEGMENTS:
${segmentSummary}

For each segment, suggest ONE B-roll clip that best matches the content. Consider:
- Keywords in the transcript matching clip names/categories
- "close-up" for detailed work (writing, calculations)
- "medium" for general study/work scenes
- "wide-shot" for establishing shots
- "timelapse" for transitions or time passing
- "random" as fallback

Return JSON array with format:
[
  {"segment_index": 0, "clip_filename": "example.mp4", "reason": "brief reason"}
]

Only return the JSON array, no other text.`

    let aiResponse: string

    if (anthropicKey) {
      // Use Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      aiResponse = data.content?.[0]?.text || '[]'
    } else if (openaiKey) {
      // Use GPT
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })

      const data = await response.json()
      aiResponse = data.choices?.[0]?.message?.content || '[]'
    } else {
      return NextResponse.json({ error: 'No AI API available', overlays: [] }, { status: 500 })
    }

    // Parse AI response
    let matches: Array<{ segment_index: number; clip_filename: string; reason: string }>

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      matches = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      console.error('Failed to parse AI response:', aiResponse)
      matches = []
    }

    // Convert to overlay format
    const overlays = matches.map(match => {
      const segment = segments[match.segment_index]
      const clip = clips.find(c => c.filename === match.clip_filename) || clips[0]

      return {
        start: segment?.start || 0,
        end: segment?.end || 0,
        clip_path: clip?.file_path || '',
        confidence: 0.8,
      }
    })

    return NextResponse.json({ overlays })
  } catch (error) {
    console.error('AI matching error:', error)
    return NextResponse.json({ error: 'AI matching failed', overlays: [] }, { status: 500 })
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
