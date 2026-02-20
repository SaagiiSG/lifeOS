'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Undo, Redo, Download, Save, ZoomIn, ZoomOut, SkipBack, SkipForward, Loader2, Smartphone, FolderOpen, Music, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { startVideoExport, pollProcessingStatus, type ProcessingJob } from '@/lib/video-processor'
import { BrollGallery } from './BrollGallery'
import { BrollOverlayTrack } from './BrollOverlayTrack'
import { SsdStatusIndicator } from './SsdStatusIndicator'
import { type BrollClip, getBrollClipsFromDatabase } from '@/lib/broll-storage'
import { type BrollOverlay, parseSrtToSegments, groupSegmentsIntoChunks, matchBrollToSegments } from '@/lib/broll-matching'
import { scanImportFolder, openImportFolder } from '@/lib/iphone-storage'

interface Caption {
  index: number
  start: number
  end: number
  text: string
}

interface VideoEditorModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  shapeId?: string
  englishCaptionsUrl?: string
  mongolianCaptionsUrl?: string
  transcriptUrl?: string
  onSave?: (data: { englishCaptions: Caption[]; mongolianCaptions: Caption[]; brollOverlays: BrollOverlay[] }) => void
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
  const parts = timestamp.replace(',', '.').split(':')
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const secondsParts = parts[2].split('.')
  const seconds = parseInt(secondsParts[0], 10) || 0
  const milliseconds = parseInt(secondsParts[1] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

export function VideoEditorModal({
  isOpen,
  onClose,
  videoUrl,
  shapeId,
  englishCaptionsUrl,
  mongolianCaptionsUrl,
  transcriptUrl,
  onSave,
}: VideoEditorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
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
  const [activeTab, setActiveTab] = useState<'english' | 'mongolian'>('english')
  const [editingCaption, setEditingCaption] = useState<{ lang: 'english' | 'mongolian'; index: number } | null>(null)
  const [undoStack, setUndoStack] = useState<{ english: Caption[][]; mongolian: Caption[][]; broll: BrollOverlay[][] }>({ english: [], mongolian: [], broll: [] })
  const [redoStack, setRedoStack] = useState<{ english: Caption[][]; mongolian: Caption[][]; broll: BrollOverlay[][] }>({ english: [], mongolian: [], broll: [] })

  // B-roll state
  const [brollClips, setBrollClips] = useState<BrollClip[]>([])
  const [brollOverlays, setBrollOverlays] = useState<BrollOverlay[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [isSsdConnected, setIsSsdConnected] = useState(false)
  const [isBrollLoading, setIsBrollLoading] = useState(false)
  const [showBrollGallery, setShowBrollGallery] = useState(true)
  const [timelineZoom, setTimelineZoom] = useState(50) // pixels per second

  // Caption position state (percentage from top)
  const [englishCaptionY, setEnglishCaptionY] = useState(75) // 75% from top (bottom area)
  const [mongolianCaptionY, setMongolianCaptionY] = useState(5) // 5% from top
  const [showShadow, setShowShadow] = useState(true) // Toggle for caption shadow
  const [draggingCaption, setDraggingCaption] = useState<'english' | 'mongolian' | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Export state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')
  const [exportedUrl, setExportedUrl] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportResolution, setExportResolution] = useState<'source' | '1080' | '4k'>('1080')
  const [burnCaptions, setBurnCaptions] = useState(true)

  // iPhone / import folder
  const [iphoneConnected, setIphoneConnected] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const [isImportScanning, setIsImportScanning] = useState(false)

  // Background music state
  const bgMusicRef = useRef<HTMLAudioElement>(null)
  const [bgMusicPath, setBgMusicPath] = useState<string | null>(null)
  const [bgMusicFilename, setBgMusicFilename] = useState<string | null>(null)
  const [bgMusicVolume, setBgMusicVolume] = useState(30)
  const [mainVolume, setMainVolume] = useState(100)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [availableMusic, setAvailableMusic] = useState<{ file_path: string; filename: string }[]>([])
  const [isMusicLoading, setIsMusicLoading] = useState(false)

  // Current B-roll overlay at playhead
  const currentBrollOverlay = brollOverlays.find(o => currentTime >= o.start && currentTime < o.end)

  // Load captions and B-roll
  useEffect(() => {
    async function loadData() {
      // Load captions
      if (englishCaptionsUrl) {
        try {
          const response = await fetch(englishCaptionsUrl)
          const text = await response.text()
          const captions = parseSRT(text)
          setEnglishCaptions(captions)

          // Auto-generate B-roll overlays if we have clips
          if (brollClips.length > 0) {
            const segments = parseSrtToSegments(text)
            const chunks = groupSegmentsIntoChunks(segments, 4)
            const overlays = matchBrollToSegments(chunks, brollClips)
            setBrollOverlays(overlays)
          }
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

      // Load B-roll clips from database
      setIsBrollLoading(true)
      try {
        const clips = await getBrollClipsFromDatabase()
        setBrollClips(clips)
      } catch (e) {
        console.error('Failed to load B-roll clips:', e)
      } finally {
        setIsBrollLoading(false)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, englishCaptionsUrl, mongolianCaptionsUrl])

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

  // Auto-scroll timeline to follow playhead
  useEffect(() => {
    if (timelineRef.current) {
      const playheadX = currentTime * timelineZoom
      const container = timelineRef.current
      const scrollLeft = container.scrollLeft
      const containerWidth = container.clientWidth

      if (playheadX < scrollLeft || playheadX > scrollLeft + containerWidth - 100) {
        container.scrollTo({ left: Math.max(0, playheadX - 100), behavior: 'smooth' })
      }
    }
  }, [currentTime, timelineZoom])

  // Sync bg music with video playback
  useEffect(() => {
    const audio = bgMusicRef.current
    if (!audio || !bgMusicPath) return

    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying, bgMusicPath])

  // Sync bg music time when video seeks
  useEffect(() => {
    const audio = bgMusicRef.current
    if (!audio || !bgMusicPath) return

    // Loop: use modulo if music is shorter than video
    if (audio.duration && isFinite(audio.duration)) {
      const targetTime = currentTime % audio.duration
      if (Math.abs(audio.currentTime - targetTime) > 1) {
        audio.currentTime = targetTime
      }
    }
  }, [currentTime, bgMusicPath])

  // Apply volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = mainVolume / 100
    }
  }, [mainVolume])

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = bgMusicVolume / 100
    }
  }, [bgMusicVolume])

  // Load available music from SSD when picker opens
  const loadMusicFiles = useCallback(async () => {
    setIsMusicLoading(true)
    try {
      const response = await fetch('/api/broll/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/Volumes/ORICO/bg sounds' }),
      })
      if (response.ok) {
        const data = await response.json()
        setAvailableMusic(data.audioFiles || [])
      }
    } catch (e) {
      console.error('Failed to load music files:', e)
    } finally {
      setIsMusicLoading(false)
    }
  }, [])

  const handleSelectMusic = useCallback((file: { file_path: string; filename: string }) => {
    setBgMusicPath(file.file_path)
    setBgMusicFilename(file.filename)
    setShowMusicPicker(false)
  }, [])

  const handleRemoveMusic = useCallback(() => {
    setBgMusicPath(null)
    setBgMusicFilename(null)
    if (bgMusicRef.current) {
      bgMusicRef.current.pause()
      bgMusicRef.current.currentTime = 0
    }
  }, [])

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

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
    // Sync bg music on seek
    if (bgMusicRef.current && bgMusicPath) {
      const audio = bgMusicRef.current
      if (audio.duration && isFinite(audio.duration)) {
        audio.currentTime = time % audio.duration
      }
    }
  }, [bgMusicPath])

  const handleSeekInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleSeek(parseFloat(e.target.value))
  }, [handleSeek])

  const seekToCaption = useCallback((caption: Caption) => {
    handleSeek(caption.start)
  }, [handleSeek])

  const skipFrames = useCallback((frames: number) => {
    if (videoRef.current) {
      const frameTime = 1 / 30 // Assume 30fps
      videoRef.current.currentTime += frames * frameTime
    }
  }, [])

  // Caption drag handlers
  const handleCaptionDragStart = useCallback((lang: 'english' | 'mongolian') => {
    setDraggingCaption(lang)
  }, [])

  const handleCaptionDrag = useCallback((e: React.MouseEvent) => {
    if (!draggingCaption || !videoContainerRef.current) return

    const rect = videoContainerRef.current.getBoundingClientRect()
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp between 2% and 90%
    const clampedY = Math.max(2, Math.min(90, y))

    if (draggingCaption === 'english') {
      setEnglishCaptionY(clampedY)
    } else {
      setMongolianCaptionY(clampedY)
    }
  }, [draggingCaption])

  const handleCaptionDragEnd = useCallback(() => {
    setDraggingCaption(null)
  }, [])

  // B-roll handlers
  const handleSsdStatusChange = useCallback((connected: boolean, path: string | null, clips: BrollClip[]) => {
    setIsSsdConnected(connected)
    if (clips.length > 0) {
      setBrollClips(clips)
    }
  }, [])

  const handleBrollRefresh = useCallback(async () => {
    setIsBrollLoading(true)
    try {
      const clips = await getBrollClipsFromDatabase()
      setBrollClips(clips)
    } finally {
      setIsBrollLoading(false)
    }
  }, [])

  const handleBrollSelect = useCallback((clip: BrollClip) => {
    // Add clip at current playhead position
    const newOverlay: BrollOverlay = {
      id: `overlay-${Date.now()}`,
      start: currentTime,
      end: Math.min(duration, currentTime + 4),
      clip,
      confidence: 1,
    }

    setUndoStack(prev => ({ ...prev, broll: [...prev.broll.slice(-19), [...brollOverlays]] }))
    setRedoStack(prev => ({ ...prev, broll: [] }))
    setBrollOverlays(prev => [...prev, newOverlay])
  }, [currentTime, duration, brollOverlays])

  const handleOverlayUpdate = useCallback((overlays: BrollOverlay[]) => {
    setBrollOverlays(overlays)
  }, [])

  const handleOverlayDelete = useCallback((overlayId: string) => {
    setUndoStack(prev => ({ ...prev, broll: [...prev.broll.slice(-19), [...brollOverlays]] }))
    setRedoStack(prev => ({ ...prev, broll: [] }))
    setBrollOverlays(prev => prev.filter(o => o.id !== overlayId))
    setSelectedOverlayId(null)
  }, [brollOverlays])

  const handleAutoGenerateBroll = useCallback(() => {
    if (englishCaptions.length === 0 || brollClips.length === 0) return

    // Convert captions to transcript segments
    const segments = englishCaptions.map(c => ({
      start: c.start,
      end: c.end,
      text: c.text,
    }))

    const chunks = groupSegmentsIntoChunks(segments, 4)
    const overlays = matchBrollToSegments(chunks, brollClips)

    setUndoStack(prev => ({ ...prev, broll: [...prev.broll.slice(-19), [...brollOverlays]] }))
    setRedoStack(prev => ({ ...prev, broll: [] }))
    setBrollOverlays(overlays)
  }, [englishCaptions, brollClips, brollOverlays])

  const saveToUndoStack = useCallback((lang: 'english' | 'mongolian') => {
    const captions = lang === 'english' ? englishCaptions : mongolianCaptions
    setUndoStack(prev => ({
      ...prev,
      [lang]: [...prev[lang].slice(-19), [...captions]]
    }))
    setRedoStack(prev => ({ ...prev, [lang]: [] }))
  }, [englishCaptions, mongolianCaptions])

  const updateCaption = useCallback((lang: 'english' | 'mongolian', index: number, updates: Partial<Caption>) => {
    saveToUndoStack(lang)

    if (lang === 'english') {
      setEnglishCaptions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c))
    } else {
      setMongolianCaptions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c))
    }
  }, [saveToUndoStack])

  const deleteCaption = useCallback((lang: 'english' | 'mongolian', index: number) => {
    saveToUndoStack(lang)

    if (lang === 'english') {
      setEnglishCaptions(prev => prev.filter((_, i) => i !== index))
    } else {
      setMongolianCaptions(prev => prev.filter((_, i) => i !== index))
    }
  }, [saveToUndoStack])

  const undo = useCallback((type: 'english' | 'mongolian' | 'broll') => {
    const stack = undoStack[type]
    if (stack.length === 0) return

    if (type === 'broll') {
      const previousState = stack[stack.length - 1] as BrollOverlay[]
      setRedoStack(prev => ({ ...prev, broll: [...prev.broll, [...brollOverlays]] }))
      setUndoStack(prev => ({ ...prev, broll: prev.broll.slice(0, -1) }))
      setBrollOverlays(previousState)
    } else {
      const currentCaptions = type === 'english' ? englishCaptions : mongolianCaptions
      const previousState = stack[stack.length - 1] as Caption[]

      setRedoStack(prev => ({
        ...prev,
        [type]: [...prev[type], [...currentCaptions]]
      }))

      setUndoStack(prev => ({
        ...prev,
        [type]: prev[type].slice(0, -1)
      }))

      if (type === 'english') {
        setEnglishCaptions(previousState)
      } else {
        setMongolianCaptions(previousState)
      }
    }
  }, [undoStack, englishCaptions, mongolianCaptions, brollOverlays])

  const redo = useCallback((type: 'english' | 'mongolian' | 'broll') => {
    const stack = redoStack[type]
    if (stack.length === 0) return

    if (type === 'broll') {
      const nextState = stack[stack.length - 1] as BrollOverlay[]
      setUndoStack(prev => ({ ...prev, broll: [...prev.broll, [...brollOverlays]] }))
      setRedoStack(prev => ({ ...prev, broll: prev.broll.slice(0, -1) }))
      setBrollOverlays(nextState)
    } else {
      const currentCaptions = type === 'english' ? englishCaptions : mongolianCaptions
      const nextState = stack[stack.length - 1] as Caption[]

      setUndoStack(prev => ({
        ...prev,
        [type]: [...prev[type], [...currentCaptions]]
      }))

      setRedoStack(prev => ({
        ...prev,
        [type]: prev[type].slice(0, -1)
      }))

      if (type === 'english') {
        setEnglishCaptions(nextState)
      } else {
        setMongolianCaptions(nextState)
      }
    }
  }, [redoStack, englishCaptions, mongolianCaptions, brollOverlays])

  const handleSave = useCallback(() => {
    onSave?.({ englishCaptions, mongolianCaptions, brollOverlays })
  }, [onSave, englishCaptions, mongolianCaptions, brollOverlays])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress(0)
    setExportStatus('Starting export...')
    setExportedUrl(null)
    setExportError(null)

    try {
      const result = await startVideoExport({
        videoUrl: videoUrl,
        shapeId: shapeId || 'unknown',
        brollOverlays: brollOverlays.map(o => ({
          start: o.start,
          end: o.end,
          clip_file_path: o.clip.file_path,
        })),
        englishCaptions: englishCaptions.map(c => ({
          start: c.start,
          end: c.end,
          text: c.text,
        })),
        mongolianCaptions: mongolianCaptions.map(c => ({
          start: c.start,
          end: c.end,
          text: c.text,
        })),
        captionSettings: {
          english_y: englishCaptionY,
          mongolian_y: mongolianCaptionY,
          show_shadow: showShadow,
          burn_captions: burnCaptions,
        },
        exportSettings: {
          resolution: exportResolution,
        },
        bgMusicPath: bgMusicPath || undefined,
        volumeSettings: {
          main_volume: mainVolume / 100,
          bg_music_volume: bgMusicVolume / 100,
        },
      })

      const job = await pollProcessingStatus(
        result.job_id,
        (job: ProcessingJob) => {
          setExportProgress(job.progress)
          setExportStatus(job.message)
        },
        2000,
        300
      )

      if (job.status === 'completed' && job.result?.output_url) {
        setExportedUrl(job.result.output_url)
        setExportStatus('Export complete!')
      } else {
        setExportError(job.message || 'Export failed')
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [videoUrl, shapeId, brollOverlays, englishCaptions, mongolianCaptions, englishCaptionY, mongolianCaptionY, showShadow, burnCaptions, exportResolution, bgMusicPath, mainVolume, bgMusicVolume])

  const handleScanImportFolder = useCallback(async () => {
    setIsImportScanning(true)
    try {
      const result = await scanImportFolder()
      setImportCount(result.count)

      if (result.files.length > 0) {
        // Convert import folder files to BrollClips and add to gallery
        const videoFiles = result.files.filter(f => f.type === 'video')
        const newClips: BrollClip[] = videoFiles.map(f => ({
          file_path: f.file_path,
          filename: f.filename,
          category: 'random' as const,
          keywords: f.filename.replace(/\.[^/.]+$/, '').split(/[-_ ]+/).filter((w: string) => w.length > 2),
        }))

        // Add only clips that aren't already in the gallery
        const existingPaths = new Set(brollClips.map(c => c.file_path))
        const uniqueNewClips = newClips.filter(c => !existingPaths.has(c.file_path))

        if (uniqueNewClips.length > 0) {
          setBrollClips(prev => [...prev, ...uniqueNewClips])
        }
      }
    } catch (error) {
      console.error('Failed to scan import folder:', error)
    } finally {
      setIsImportScanning(false)
    }
  }, [brollClips])

  const handleOpenImportFolder = useCallback(async () => {
    await openImportFolder()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === ' ' && !editingCaption) {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'Escape') {
        if (editingCaption) {
          setEditingCaption(null)
        } else if (selectedOverlayId) {
          setSelectedOverlayId(null)
        } else {
          onClose()
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo(activeTab)
        } else {
          undo(activeTab)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        skipFrames(e.shiftKey ? -10 : -1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        skipFrames(e.shiftKey ? 10 : 1)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedOverlayId && !editingCaption) {
          e.preventDefault()
          handleOverlayDelete(selectedOverlayId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, togglePlay, onClose, editingCaption, activeTab, undo, redo, skipFrames, selectedOverlayId, handleOverlayDelete])

  if (!isOpen) return null

  const activeCaptions = activeTab === 'english' ? englishCaptions : mongolianCaptions

  return (
    <div className="fixed inset-0 z-[100] flex bg-black">
      {/* Left Sidebar - B-Roll Gallery */}
      {showBrollGallery && (
        <div className="w-64 border-r border-zinc-800">
          <BrollGallery
            clips={brollClips}
            onClipSelect={handleBrollSelect}
            onRefresh={handleBrollRefresh}
            isLoading={isBrollLoading}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Video Editor</h2>
            <SsdStatusIndicator
              onSsdStatusChange={handleSsdStatusChange}
              onIphoneStatusChange={(status) => setIphoneConnected(status.connected)}
              showModal={false}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBrollGallery(!showBrollGallery)}
              className={showBrollGallery ? 'bg-zinc-800' : ''}
            >
              B-Roll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGenerateBroll}
              disabled={brollClips.length === 0 || englishCaptions.length === 0}
            >
              Auto B-Roll
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowMusicPicker(true)
                loadMusicFiles()
              }}
              className={bgMusicPath ? 'bg-purple-600/30 text-purple-400' : ''}
            >
              <Music className="mr-1 h-4 w-4" />
              {bgMusicPath ? 'Music On' : 'Music'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenImportFolder}
              title="Open ~/Documents/b-roll in Finder"
            >
              <FolderOpen className="mr-1 h-4 w-4" />
              B-Roll Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScanImportFolder}
              disabled={isImportScanning}
              className={importCount > 0 ? 'text-blue-400' : ''}
              title="Scan ~/Documents/b-roll for AirDropped clips"
            >
              {isImportScanning ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-1 h-4 w-4" />
              )}
              {importCount > 0 ? `AirDrop (${importCount})` : 'Scan AirDrop'}
            </Button>
            <div className="mx-2 h-6 w-px bg-zinc-700" />
            <Button variant="ghost" size="sm" onClick={() => undo(activeTab)} disabled={undoStack[activeTab].length === 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => redo(activeTab)} disabled={redoStack[activeTab].length === 0}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Video Preview and Caption Editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video Preview (Center) */}
          <div className="flex flex-1 flex-col items-center justify-center bg-black p-4">
            <div
              ref={videoContainerRef}
              className="relative overflow-hidden rounded-lg bg-zinc-900"
              style={{ aspectRatio: '9/16', maxHeight: '55vh' }}
              onMouseMove={draggingCaption ? handleCaptionDrag : undefined}
              onMouseUp={handleCaptionDragEnd}
              onMouseLeave={handleCaptionDragEnd}
            >
              {/* B-Roll overlay preview */}
              {currentBrollOverlay && currentBrollOverlay.clip.thumbnail_url && (
                <div className="absolute inset-0 z-10">
                  <video
                    src={`/api/broll/video?path=${encodeURIComponent(currentBrollOverlay.clip.file_path)}`}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
              )}

              {/* Main Video */}
              <video
                ref={videoRef}
                src={videoUrl}
                className={`h-full w-full object-contain ${currentBrollOverlay ? 'opacity-0' : ''}`}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
                playsInline
              />

              {/* Mongolian Caption (Draggable) */}
              {showMongolian && currentMongolian && (
                <div
                  className={`absolute left-0 right-0 z-20 px-4 ${draggingCaption === 'mongolian' ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ top: `${mongolianCaptionY}%` }}
                  onMouseDown={() => handleCaptionDragStart('mongolian')}
                >
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

              {/* English Caption (Draggable) */}
              {showEnglish && currentEnglish && (
                <div
                  className={`absolute left-0 right-0 z-20 px-4 ${draggingCaption === 'english' ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{ top: `${englishCaptionY}%` }}
                  onMouseDown={() => handleCaptionDragStart('english')}
                >
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

              {/* B-Roll indicator */}
              {currentBrollOverlay && (
                <div className="absolute right-2 top-2 z-20 rounded bg-purple-600 px-2 py-1 text-xs text-white">
                  B-Roll: {currentBrollOverlay.clip.filename}
                </div>
              )}
            </div>

            {/* Hidden BG Music Audio Element */}
            {bgMusicPath && (
              <audio
                ref={bgMusicRef}
                src={`/api/broll/video?path=${encodeURIComponent(bgMusicPath)}`}
                loop
                preload="auto"
              />
            )}

            {/* Video Controls */}
            <div className="mt-4 w-full max-w-lg">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={handleSeekInput}
                className="mb-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-700"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => skipFrames(-10)} className="rounded p-1 hover:bg-zinc-800">
                    <SkipBack className="h-4 w-4 text-white" />
                  </button>
                  <button onClick={togglePlay} className="rounded-full p-2 hover:bg-zinc-800">
                    {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                  </button>
                  <button onClick={() => skipFrames(10)} className="rounded p-1 hover:bg-zinc-800">
                    <SkipForward className="h-4 w-4 text-white" />
                  </button>
                  <button onClick={toggleMute} className="rounded p-2 hover:bg-zinc-800">
                    {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                  </button>
                  <span className="text-sm text-zinc-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEnglish(!showEnglish)}
                    className={`rounded px-2 py-1 text-xs ${showEnglish ? 'bg-white text-black' : 'bg-zinc-700 text-white'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setShowMongolian(!showMongolian)}
                    className={`rounded px-2 py-1 text-xs ${showMongolian ? 'bg-yellow-500 text-black' : 'bg-zinc-700 text-white'}`}
                  >
                    MN
                  </button>
                  <button
                    onClick={() => setShowShadow(!showShadow)}
                    className={`rounded px-2 py-1 text-xs ${showShadow ? 'bg-purple-500 text-white' : 'bg-zinc-700 text-white'}`}
                    title="Toggle caption shadow"
                  >
                    Shadow
                  </button>
                </div>
              </div>

              {/* Volume Controls */}
              <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="w-12 shrink-0 text-xs text-zinc-400">Main</span>
                  <Slider
                    value={[mainVolume]}
                    onValueChange={([val]) => setMainVolume(val)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-8 text-right text-xs text-zinc-500">{mainVolume}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Music2 className="h-4 w-4 shrink-0 text-purple-400" />
                  <span className="w-12 shrink-0 text-xs text-zinc-400">Music</span>
                  <Slider
                    value={[bgMusicVolume]}
                    onValueChange={([val]) => setBgMusicVolume(val)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                    disabled={!bgMusicPath}
                  />
                  <span className="w-8 text-right text-xs text-zinc-500">{bgMusicVolume}%</span>
                </div>
                {bgMusicFilename && (
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs text-purple-400">{bgMusicFilename}</span>
                    <button
                      onClick={handleRemoveMusic}
                      className="ml-2 rounded p-0.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Caption Editor (Right) */}
          <div className="w-80 border-l border-zinc-800 bg-zinc-900">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('english')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'english' ? 'border-b-2 border-white text-white' : 'text-zinc-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setActiveTab('mongolian')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'mongolian' ? 'border-b-2 border-yellow-500 text-yellow-500' : 'text-zinc-400'
                }`}
              >
                Mongolian
              </button>
            </div>

            {/* Caption List */}
            <div className="h-[calc(100%-48px)] overflow-y-auto p-3">
              {activeCaptions.length === 0 ? (
                <p className="text-center text-sm text-zinc-500">No captions available</p>
              ) : (
                <div className="space-y-2">
                  {activeCaptions.map((caption, index) => (
                    <div
                      key={caption.index}
                      className={`rounded-lg border p-2 transition-colors ${
                        currentTime >= caption.start && currentTime <= caption.end
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <button
                          onClick={() => seekToCaption(caption)}
                          className="text-[10px] text-zinc-400 hover:text-white"
                        >
                          {formatTime(caption.start)} → {formatTime(caption.end)}
                        </button>
                        <button
                          onClick={() => deleteCaption(activeTab, index)}
                          className="rounded p-0.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {editingCaption?.lang === activeTab && editingCaption?.index === index ? (
                        <textarea
                          autoFocus
                          value={caption.text}
                          onChange={(e) => updateCaption(activeTab, index, { text: e.target.value })}
                          onBlur={() => setEditingCaption(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingCaption(null)
                          }}
                          className="w-full resize-none rounded bg-zinc-700 p-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500"
                          rows={2}
                        />
                      ) : (
                        <p
                          onClick={() => setEditingCaption({ lang: activeTab, index })}
                          className={`cursor-text text-xs ${
                            activeTab === 'mongolian' ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          {caption.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="border-t border-zinc-800 bg-zinc-900">
          {/* Timeline Controls */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Timeline</span>
              <span className="text-xs text-zinc-500">({brollOverlays.length} overlays)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setTimelineZoom(Math.max(20, timelineZoom - 10))}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs text-zinc-400">{timelineZoom}px/s</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setTimelineZoom(Math.min(200, timelineZoom + 10))}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Timeline Tracks */}
          <div ref={timelineRef} className="h-32 overflow-x-auto overflow-y-hidden">
            <BrollOverlayTrack
              overlays={brollOverlays}
              videoDuration={duration}
              currentTime={currentTime}
              zoom={timelineZoom}
              onOverlayUpdate={handleOverlayUpdate}
              onOverlayDelete={handleOverlayDelete}
              onOverlaySelect={(overlay) => setSelectedOverlayId(overlay?.id || null)}
              onSeek={handleSeek}
              selectedOverlayId={selectedOverlayId}
            />
          </div>
        </div>
      </div>

      {/* Music Picker Dialog */}
      <Dialog open={showMusicPicker} onOpenChange={setShowMusicPicker}>
        <DialogContent className="z-[200] border-zinc-800 bg-zinc-900 sm:max-w-md" overlayClassName="z-[150]">
          <DialogHeader>
            <DialogTitle className="text-white">Select Background Music</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto py-2">
            {isMusicLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : availableMusic.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No audio files found. Make sure your SSD is connected and files are in /Volumes/ORICO/bg sounds
              </p>
            ) : (
              <div className="space-y-1">
                {availableMusic.map((file) => (
                  <button
                    key={file.file_path}
                    onClick={() => handleSelectMusic(file)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-800 ${
                      bgMusicPath === file.file_path ? 'bg-purple-600/20 text-purple-400' : 'text-zinc-300'
                    }`}
                  >
                    <Music className="h-4 w-4 shrink-0 text-purple-400" />
                    <span className="truncate text-sm">{file.filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="z-[200] border-zinc-800 bg-zinc-900 sm:max-w-md" overlayClassName="z-[150]">
          <DialogHeader>
            <DialogTitle className="text-white">Export Video</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Resolution</label>
              <Select
                value={exportResolution}
                onValueChange={(val) => setExportResolution(val as 'source' | '1080' | '4k')}
                disabled={isExporting}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[250] border-zinc-700 bg-zinc-800">
                  <SelectItem value="1080">1080x1920 (Full HD)</SelectItem>
                  <SelectItem value="4k">2160x3840 (4K)</SelectItem>
                  <SelectItem value="source">Match Source</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Burn Captions Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-300">Burn in captions</label>
                <p className="text-xs text-zinc-500">Permanently render captions onto video</p>
              </div>
              <Switch
                checked={burnCaptions}
                onCheckedChange={setBurnCaptions}
                disabled={isExporting}
              />
            </div>

            {/* Summary */}
            <div className="space-y-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-400">
                Duration: {formatTime(duration)}
              </p>
              <p className="text-xs text-zinc-400">
                B-Roll overlays: {brollOverlays.length}
              </p>
              <p className="text-xs text-zinc-400">
                Captions: {englishCaptions.length} EN / {mongolianCaptions.length} MN
              </p>
              {bgMusicFilename && (
                <p className="text-xs text-zinc-400">
                  BG Music: {bgMusicFilename} (Main {mainVolume}% / Music {bgMusicVolume}%)
                </p>
              )}
            </div>

            {/* Progress */}
            {(isExporting || exportedUrl || exportError) && (
              <div className="space-y-3">
                <Progress value={exportProgress} className="h-2" />
                <p className="text-center text-sm text-zinc-400">{exportStatus}</p>

                {exportError && (
                  <p className="text-center text-sm text-red-400">{exportError}</p>
                )}

                {exportedUrl && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(exportedUrl, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Exported Video
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700"
                onClick={() => {
                  setShowExportDialog(false)
                  setExportedUrl(null)
                  setExportError(null)
                  setExportProgress(0)
                }}
                disabled={isExporting}
              >
                {exportedUrl ? 'Close' : 'Cancel'}
              </Button>
              {!exportedUrl && (
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    'Start Export'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
