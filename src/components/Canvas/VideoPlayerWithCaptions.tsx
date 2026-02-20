'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'

interface Caption {
  index: number
  start: number // in seconds
  end: number
  text: string
}

interface VideoPlayerWithCaptionsProps {
  videoUrl: string
  englishCaptionsUrl?: string
  mongolianCaptionsUrl?: string
  onClose?: () => void
}

function parseSRT(srtContent: string): Caption[] {
  const captions: Caption[] = []
  const blocks = srtContent.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    const index = parseInt(lines[0], 10)
    const timeParts = lines[1].split(' --> ')
    if (timeParts.length !== 2) continue

    const start = parseTimestamp(timeParts[0])
    const end = parseTimestamp(timeParts[1])
    const text = lines.slice(2).join('\n')

    captions.push({ index, start, end, text })
  }

  return captions
}

function parseTimestamp(timestamp: string): number {
  // Format: HH:MM:SS,mmm or HH:MM:SS.mmm
  const parts = timestamp.replace(',', '.').split(':')
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const secondsParts = parts[2].split('.')
  const seconds = parseInt(secondsParts[0], 10) || 0
  const milliseconds = parseInt(secondsParts[1] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

export function VideoPlayerWithCaptions({
  videoUrl,
  englishCaptionsUrl,
  mongolianCaptionsUrl,
  onClose,
}: VideoPlayerWithCaptionsProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [englishCaptions, setEnglishCaptions] = useState<Caption[]>([])
  const [mongolianCaptions, setMongolianCaptions] = useState<Caption[]>([])
  const [currentEnglish, setCurrentEnglish] = useState('')
  const [currentMongolian, setCurrentMongolian] = useState('')
  const [showEnglish, setShowEnglish] = useState(true)
  const [showMongolian, setShowMongolian] = useState(true)
  const [showShadow, setShowShadow] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load captions
  useEffect(() => {
    async function loadCaptions() {
      if (englishCaptionsUrl) {
        try {
          const response = await fetch(englishCaptionsUrl)
          const text = await response.text()
          setEnglishCaptions(parseSRT(text))
        } catch (e) {
          console.error('Failed to load English captions:', e)
        }
      }

      if (mongolianCaptionsUrl) {
        try {
          const response = await fetch(mongolianCaptionsUrl)
          const text = await response.text()
          setMongolianCaptions(parseSRT(text))
        } catch (e) {
          console.error('Failed to load Mongolian captions:', e)
        }
      }
    }

    loadCaptions()
  }, [englishCaptionsUrl, mongolianCaptionsUrl])

  // Update current caption based on time
  useEffect(() => {
    const englishCaption = englishCaptions.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    )
    setCurrentEnglish(englishCaption?.text || '')

    const mongolianCaption = mongolianCaptions.find(
      (c) => currentTime >= c.start && currentTime <= c.end
    )
    setCurrentMongolian(mongolianCaption?.text || '')
  }, [currentTime, englishCaptions, mongolianCaptions])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
      setIsFullscreen(!isFullscreen)
    }
  }, [isFullscreen])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-black"
      style={{ aspectRatio: '9/16', maxHeight: '80vh' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* Mongolian Caption (Top) */}
      {showMongolian && currentMongolian && (
        <div className="absolute left-0 right-0 top-6 px-4">
          <div className="mx-auto max-w-[90%] px-3 py-1.5">
            <p
              className="text-center text-xs font-normal"
              style={{
                color: '#FFD700',
                textShadow: showShadow
                  ? '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9), 1px -1px 3px rgba(0,0,0,0.9), -1px 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)'
                  : 'none',
              }}
            >
              {currentMongolian}
            </p>
          </div>
        </div>
      )}

      {/* English Caption (Bottom) */}
      {showEnglish && currentEnglish && (
        <div className="absolute bottom-24 left-0 right-0 px-4">
          <div className="mx-auto max-w-[90%] px-3 py-2">
            <p
              className="text-center text-base font-bold text-white"
              style={{
                WebkitTextStroke: '0.5px rgba(0,0,0,0.5)',
                textShadow: showShadow
                  ? '2px 2px 4px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.9), 2px -2px 4px rgba(0,0,0,0.9), -2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)'
                  : 'none',
              }}
            >
              {currentEnglish}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="rounded-full p-1 hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" fill="white" />
              ) : (
                <Play className="h-5 w-5 text-white" fill="white" />
              )}
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="rounded-full p-1 hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </button>

            {/* Time */}
            <span className="text-xs text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Caption toggles */}
            <button
              onClick={() => setShowEnglish(!showEnglish)}
              className={`rounded px-2 py-0.5 text-xs ${
                showEnglish ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setShowMongolian(!showMongolian)}
              className={`rounded px-2 py-0.5 text-xs ${
                showMongolian ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'
              }`}
            >
              MN
            </button>
            <button
              onClick={() => setShowShadow(!showShadow)}
              className={`rounded px-2 py-0.5 text-xs ${
                showShadow ? 'bg-purple-500 text-white' : 'bg-white/20 text-white'
              }`}
              title="Toggle shadow"
            >
              S
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-1 hover:bg-white/20"
            >
              <Maximize2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        >
          ✕
        </button>
      )}
    </div>
  )
}
