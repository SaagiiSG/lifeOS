'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Search,
  Filter,
  Clock,
  Film,
  Camera,
  Video,
  Shuffle,
  User,
  ChevronDown,
  ChevronRight,
  Play,
  GripVertical,
  RefreshCw,
} from 'lucide-react'
import { getBrollClipsFromDatabase, getBrollVideoUrl, type BrollClip } from '@/lib/broll-storage'

interface BrollGalleryProps {
  clips: BrollClip[]
  onClipSelect?: (clip: BrollClip) => void
  onClipDragStart?: (clip: BrollClip, event: React.DragEvent) => void
  onRefresh?: () => void
  isLoading?: boolean
}

const CATEGORY_INFO: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  timelapse: { icon: <Clock className="h-4 w-4" />, label: 'Timelapse', color: 'text-blue-400' },
  medium: { icon: <Film className="h-4 w-4" />, label: 'Medium', color: 'text-green-400' },
  'wide-shot': { icon: <Camera className="h-4 w-4" />, label: 'Wide Shot', color: 'text-purple-400' },
  'close-up': { icon: <Video className="h-4 w-4" />, label: 'Close-up', color: 'text-yellow-400' },
  random: { icon: <Shuffle className="h-4 w-4" />, label: 'Random', color: 'text-zinc-400' },
  'walking-selfie': { icon: <User className="h-4 w-4" />, label: 'Walking Selfie', color: 'text-pink-400' },
}

export function BrollGallery({
  clips,
  onClipSelect,
  onClipDragStart,
  onRefresh,
  isLoading = false,
}: BrollGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORY_INFO)))
  const [previewClip, setPreviewClip] = useState<BrollClip | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Group clips by category
  const clipsByCategory = clips.reduce((acc, clip) => {
    const category = clip.category || 'random'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(clip)
    return acc
  }, {} as Record<string, BrollClip[]>)

  // Filter clips based on search
  const filteredClipsByCategory = Object.entries(clipsByCategory).reduce((acc, [category, categoryClips]) => {
    const filtered = categoryClips.filter(clip => {
      const matchesSearch = !searchQuery ||
        clip.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clip.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = !selectedCategory || category === selectedCategory
      return matchesSearch && matchesCategory
    })
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, BrollClip[]>)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleDragStart = (clip: BrollClip, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify(clip))
    event.dataTransfer.effectAllowed = 'copy'
    onClipDragStart?.(clip, event)
  }

  const handleClipHover = (clip: BrollClip | null) => {
    setPreviewClip(clip)
    if (clip && videoRef.current) {
      videoRef.current.src = getBrollVideoUrl(clip.file_path)
      videoRef.current.play().catch(() => {})
    }
  }

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-700 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">B-Roll Gallery</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="mt-2 flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            All ({clips.length})
          </Button>
          {Object.entries(CATEGORY_INFO).map(([key, { label, color }]) => {
            const count = clipsByCategory[key]?.length || 0
            if (count === 0) return null
            return (
              <Button
                key={key}
                variant={selectedCategory === key ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-6 px-2 text-xs ${selectedCategory !== key ? color : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              >
                {label} ({count})
              </Button>
            )
          })}
        </div>
      </div>

      {/* Clip Preview on Hover */}
      {previewClip && (
        <div className="border-b border-zinc-700 bg-black p-2">
          <video
            ref={videoRef}
            className="aspect-video w-full rounded object-cover"
            muted
            loop
            playsInline
          />
          <p className="mt-1 truncate text-xs text-zinc-400">{previewClip.filename}</p>
        </div>
      )}

      {/* Clips List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : Object.keys(filteredClipsByCategory).length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-zinc-500">
            <Film className="h-8 w-8" />
            <p className="mt-2 text-sm">No clips found</p>
          </div>
        ) : (
          Object.entries(filteredClipsByCategory).map(([category, categoryClips]) => {
            const info = CATEGORY_INFO[category] || CATEGORY_INFO.random
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-800"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}
                  <span className={info.color}>{info.icon}</span>
                  <span className="text-sm font-medium text-white">{info.label}</span>
                  <span className="text-xs text-zinc-500">({categoryClips.length})</span>
                </button>

                {/* Category Clips */}
                {isExpanded && (
                  <div className="mt-1 grid grid-cols-2 gap-1.5 pl-6">
                    {categoryClips.map((clip) => (
                      <div
                        key={clip.file_path}
                        draggable
                        onDragStart={(e) => handleDragStart(clip, e)}
                        onMouseEnter={() => handleClipHover(clip)}
                        onMouseLeave={() => handleClipHover(null)}
                        onClick={() => onClipSelect?.(clip)}
                        className="group relative cursor-grab overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-all hover:border-purple-500 active:cursor-grabbing"
                      >
                        {/* Thumbnail */}
                        <div className="aspect-video bg-zinc-900">
                          {clip.thumbnail_url ? (
                            <img
                              src={clip.thumbnail_url}
                              alt={clip.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Video className="h-6 w-6 text-zinc-600" />
                            </div>
                          )}
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <GripVertical className="h-6 w-6 text-white" />
                        </div>

                        {/* Duration Badge */}
                        {clip.duration && (
                          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                            {formatDuration(clip.duration)}
                          </div>
                        )}

                        {/* Filename */}
                        <div className="p-1">
                          <p className="truncate text-[10px] text-zinc-400">{clip.filename}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-zinc-700 px-3 py-2">
        <p className="text-xs text-zinc-500">
          {clips.length} total clips • Drag to timeline
        </p>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
