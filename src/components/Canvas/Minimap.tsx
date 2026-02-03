'use client'

import { useEditor, useValue } from 'tldraw'
import { useState } from 'react'
import { Minimize2, Maximize2 } from 'lucide-react'

export function Minimap() {
  const editor = useEditor()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const shapes = useValue(
    'shapes',
    () => {
      const allShapes = editor.getCurrentPageShapes()
      return allShapes.map((shape) => ({
        id: shape.id,
        x: shape.x,
        y: shape.y,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        w: (shape.props as any)?.w || 100,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h: (shape.props as any)?.h || 100,
        type: shape.type,
      }))
    },
    [editor]
  )

  const viewport = useValue(
    'viewport',
    () => {
      const bounds = editor.getViewportPageBounds()
      return {
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
      }
    },
    [editor]
  )

  if (shapes.length === 0) return null

  // Calculate bounds of all shapes
  const allBounds = shapes.reduce(
    (acc, shape) => ({
      minX: Math.min(acc.minX, shape.x),
      minY: Math.min(acc.minY, shape.y),
      maxX: Math.max(acc.maxX, shape.x + shape.w),
      maxY: Math.max(acc.maxY, shape.y + shape.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )

  // Add padding and include viewport
  const padding = 200
  const bounds = {
    minX: Math.min(allBounds.minX - padding, viewport.x),
    minY: Math.min(allBounds.minY - padding, viewport.y),
    maxX: Math.max(allBounds.maxX + padding, viewport.x + viewport.w),
    maxY: Math.max(allBounds.maxY + padding, viewport.y + viewport.h),
  }

  const boundsW = bounds.maxX - bounds.minX
  const boundsH = bounds.maxY - bounds.minY

  const minimapW = 160
  const minimapH = 100
  const scale = Math.min(minimapW / boundsW, minimapH / boundsH)

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text-node':
        return '#ffffff'
      case 'goal-node':
        return '#3b82f6'
      case 'habit-node':
        return '#22c55e'
      case 'task-node':
        return '#8b5cf6'
      case 'video-node':
        return '#a855f7'
      case 'budget-node':
        return '#10b981'
      case 'learning-node':
        return '#06b6d4'
      case 'content-idea-node':
        return '#ec4899'
      case 'chart-node':
        return '#8b5cf6'
      case 'calendar-event-node':
        return '#0ea5e9'
      case 'follower-count-node':
        return '#f43f5e'
      case 'connection':
        return '#71717a'
      default:
        return '#71717a'
    }
  }

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert minimap coords to canvas coords
    const canvasX = bounds.minX + x / scale
    const canvasY = bounds.minY + y / scale

    editor.centerOnPoint({ x: canvasX, y: canvasY }, { animation: { duration: 300 } })
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute bottom-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 text-zinc-400 backdrop-blur-sm transition-colors hover:text-white"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="absolute bottom-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-900/90 p-2 backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Minimap
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-zinc-500 transition-colors hover:text-white"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>
      <div
        className="relative cursor-pointer overflow-hidden rounded bg-zinc-950"
        style={{ width: minimapW, height: minimapH }}
        onClick={handleMinimapClick}
      >
        {/* Shapes */}
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className="absolute rounded-sm"
            style={{
              left: (shape.x - bounds.minX) * scale,
              top: (shape.y - bounds.minY) * scale,
              width: Math.max(shape.w * scale, 2),
              height: Math.max(shape.h * scale, 2),
              backgroundColor: getTypeColor(shape.type),
              opacity: 0.7,
            }}
          />
        ))}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-white/50"
          style={{
            left: (viewport.x - bounds.minX) * scale,
            top: (viewport.y - bounds.minY) * scale,
            width: viewport.w * scale,
            height: viewport.h * scale,
          }}
        />
      </div>
    </div>
  )
}
