'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, GripHorizontal, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'
import { type BrollClip } from '@/lib/broll-storage'
import { type BrollOverlay } from '@/lib/broll-matching'

interface BrollOverlayTrackProps {
  overlays: BrollOverlay[]
  videoDuration: number
  currentTime: number
  zoom: number // pixels per second
  onOverlayUpdate: (overlays: BrollOverlay[]) => void
  onOverlayDelete: (overlayId: string) => void
  onOverlaySelect: (overlay: BrollOverlay | null) => void
  onSeek: (time: number) => void
  selectedOverlayId: string | null
}

export function BrollOverlayTrack({
  overlays,
  videoDuration,
  currentTime,
  zoom,
  onOverlayUpdate,
  onOverlayDelete,
  onOverlaySelect,
  onSeek,
  selectedOverlayId,
}: BrollOverlayTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{ overlayId: string; type: 'move' | 'resize-start' | 'resize-end' } | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)

  const trackWidth = videoDuration * zoom

  // Find current overlay at playhead position
  const currentOverlay = overlays.find(o => currentTime >= o.start && currentTime < o.end)

  const handleMouseDown = (
    e: React.MouseEvent,
    overlayId: string,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const overlay = overlays.find(o => o.id === overlayId)
    if (!overlay) return

    setDragging({ overlayId, type })
    setDragStartX(e.clientX)
    setDragStartTime(type === 'resize-end' ? overlay.end : overlay.start)
    onOverlaySelect(overlay)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const deltaX = e.clientX - dragStartX
    const deltaTime = deltaX / zoom

    const newOverlays = overlays.map(overlay => {
      if (overlay.id !== dragging.overlayId) return overlay

      const updated = { ...overlay }

      if (dragging.type === 'move') {
        const duration = overlay.end - overlay.start
        const newStart = Math.max(0, Math.min(videoDuration - duration, dragStartTime + deltaTime))
        updated.start = newStart
        updated.end = newStart + duration
      } else if (dragging.type === 'resize-start') {
        const newStart = Math.max(0, Math.min(overlay.end - 0.5, dragStartTime + deltaTime))
        updated.start = newStart
      } else if (dragging.type === 'resize-end') {
        const newEnd = Math.max(overlay.start + 0.5, Math.min(videoDuration, dragStartTime + deltaTime))
        updated.end = newEnd
      }

      return updated
    })

    onOverlayUpdate(newOverlays)
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging])

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = x / zoom

    onSeek(Math.max(0, Math.min(videoDuration, time)))
    onOverlaySelect(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    try {
      const clipData = e.dataTransfer.getData('application/json')
      if (!clipData) return

      const clip: BrollClip = JSON.parse(clipData)
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const dropTime = x / zoom

      // Create new overlay at drop position
      const newOverlay: BrollOverlay = {
        id: `overlay-${Date.now()}`,
        start: Math.max(0, dropTime),
        end: Math.min(videoDuration, dropTime + 4), // Default 4 second duration
        clip,
        confidence: 1,
      }

      onOverlayUpdate([...overlays, newOverlay])
    } catch (error) {
      console.error('Drop error:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  return (
    <div className="relative">
      {/* Track Label */}
      <div className="flex h-8 items-center gap-2 border-b border-zinc-700 bg-zinc-800/50 px-3">
        <div className="h-3 w-3 rounded-full bg-purple-500" />
        <span className="text-xs font-medium text-zinc-300">B-Roll</span>
        <span className="text-xs text-zinc-500">({overlays.length} clips)</span>
      </div>

      {/* Track Content */}
      <div
        ref={trackRef}
        className="relative h-20 overflow-hidden border-b border-zinc-700 bg-zinc-900/50"
        style={{ width: `${trackWidth}px` }}
        onClick={handleTrackClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0">
          {Array.from({ length: Math.ceil(videoDuration) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-zinc-800"
              style={{ left: `${i * zoom}px` }}
            />
          ))}
        </div>

        {/* Overlays */}
        {overlays.map(overlay => {
          const left = overlay.start * zoom
          const width = (overlay.end - overlay.start) * zoom
          const isSelected = overlay.id === selectedOverlayId
          const isCurrent = overlay === currentOverlay

          return (
            <div
              key={overlay.id}
              className={`absolute top-2 h-16 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-purple-500 ring-2 ring-purple-500/30'
                  : isCurrent
                    ? 'border-purple-400'
                    : 'border-zinc-600'
              } ${dragging?.overlayId === overlay.id ? 'opacity-80' : ''}`}
              style={{ left: `${left}px`, width: `${width}px` }}
              onClick={(e) => {
                e.stopPropagation()
                onOverlaySelect(overlay)
              }}
            >
              {/* Thumbnail Background */}
              <div className="absolute inset-0 overflow-hidden rounded-md bg-zinc-800">
                {overlay.clip.thumbnail_url ? (
                  <img
                    src={overlay.clip.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover opacity-60"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-purple-900/30">
                    <span className="text-lg">🎬</span>
                  </div>
                )}
              </div>

              {/* Clip Info */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                <p className="truncate text-[10px] text-white">{overlay.clip.filename}</p>
              </div>

              {/* Move Handle */}
              <div
                className="absolute inset-x-4 top-0 flex h-5 cursor-grab items-center justify-center active:cursor-grabbing"
                onMouseDown={(e) => handleMouseDown(e, overlay.id, 'move')}
              >
                <GripHorizontal className="h-3 w-3 text-zinc-400" />
              </div>

              {/* Resize Handles */}
              <div
                className="absolute bottom-0 left-0 top-0 w-2 cursor-ew-resize hover:bg-purple-500/30"
                onMouseDown={(e) => handleMouseDown(e, overlay.id, 'resize-start')}
              />
              <div
                className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize hover:bg-purple-500/30"
                onMouseDown={(e) => handleMouseDown(e, overlay.id, 'resize-end')}
              />

              {/* Delete Button (shown when selected) */}
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOverlayDelete(overlay.id)
                  }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}

              {/* Confidence Indicator */}
              {overlay.confidence < 0.5 && (
                <div className="absolute right-1 top-1 rounded bg-yellow-500/80 px-1 text-[8px] font-medium text-black">
                  Low match
                </div>
              )}
            </div>
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-red-500"
          style={{ left: `${currentTime * zoom}px` }}
        >
          <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red-500" />
        </div>

        {/* Drop Zone Indicator */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity [.drag-over_&]:opacity-100">
          <div className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm text-purple-400">
            Drop B-roll here
          </div>
        </div>
      </div>
    </div>
  )
}
