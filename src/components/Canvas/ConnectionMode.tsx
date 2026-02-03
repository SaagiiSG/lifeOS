'use client'

import { useEffect, useCallback } from 'react'
import { useEditor, createShapeId, TLShapeId } from 'tldraw'
import { X } from 'lucide-react'

interface ConnectionModeProps {
  isActive: boolean
  onClose: () => void
  sourceId: TLShapeId | null
  setSourceId: (id: TLShapeId | null) => void
}

const nodeTypes = [
  'text-node', 'goal-node', 'video-node', 'habit-node', 'task-node',
  'budget-node', 'learning-node', 'content-idea-node', 'chart-node',
  'calendar-event-node', 'follower-count-node'
]

export function ConnectionMode({ isActive, onClose, sourceId, setSourceId }: ConnectionModeProps) {
  const editor = useEditor()

  const handleShapeClick = useCallback(
    (shapeId: TLShapeId) => {
      const shape = editor.getShape(shapeId)
      if (!shape || !nodeTypes.includes(shape.type as string)) return

      if (!sourceId) {
        // First click - set source
        setSourceId(shapeId)
        editor.select(shapeId)
      } else if (shapeId !== sourceId) {
        // Second click - create connection
        const sourceShape = editor.getShape(sourceId)
        const targetShape = editor.getShape(shapeId)

        if (!sourceShape || !targetShape) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sourceProps = sourceShape.props as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const targetProps = targetShape.props as any

        // Calculate position for the connection (at source position)
        const connectionId = createShapeId()

        // Determine best anchors based on relative positions
        const sourceCenter = {
          x: sourceShape.x + (sourceProps.w || 200) / 2,
          y: sourceShape.y + (sourceProps.h || 100) / 2,
        }
        const targetCenter = {
          x: targetShape.x + (targetProps.w || 200) / 2,
          y: targetShape.y + (targetProps.h || 100) / 2,
        }

        const dx = targetCenter.x - sourceCenter.x
        const dy = targetCenter.y - sourceCenter.y

        let fromAnchor = 'right'
        let toAnchor = 'left'

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal connection
          fromAnchor = dx > 0 ? 'right' : 'left'
          toAnchor = dx > 0 ? 'left' : 'right'
        } else {
          // Vertical connection
          fromAnchor = dy > 0 ? 'bottom' : 'top'
          toAnchor = dy > 0 ? 'top' : 'bottom'
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.createShape({
          id: connectionId,
          type: 'connection',
          x: Math.min(sourceShape.x, targetShape.x),
          y: Math.min(sourceShape.y, targetShape.y),
          props: {
            fromId: sourceId,
            toId: shapeId,
            fromAnchor,
            toAnchor,
            color: 'zinc',
            style: 'solid',
            label: '',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        // Reset and close
        setSourceId(null)
        editor.select(connectionId)
        onClose()
      }
    },
    [editor, sourceId, setSourceId, onClose]
  )

  useEffect(() => {
    if (!isActive) return

    const handlePointerDown = (e: PointerEvent) => {
      // Get shape at pointer position
      const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
      const shapes = editor.getCurrentPageShapes()

      // Find shape at point
      for (const shape of shapes) {
        if (!nodeTypes.includes(shape.type as string)) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = shape.props as any
        const w = props.w || 200
        const h = props.h || 100

        if (
          point.x >= shape.x &&
          point.x <= shape.x + w &&
          point.y >= shape.y &&
          point.y <= shape.y + h
        ) {
          handleShapeClick(shape.id)
          return
        }
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, { capture: true })

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
    }
  }, [isActive, editor, handleShapeClick])

  // Handle escape key
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSourceId(null)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onClose, setSourceId])

  if (!isActive) return null

  return (
    <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg border border-blue-500/50 bg-blue-950/90 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span className="text-sm font-medium text-white">
            {sourceId ? 'Click target node to connect' : 'Click source node to start connection'}
          </span>
        </div>
        <button
          onClick={() => {
            setSourceId(null)
            onClose()
          }}
          className="rounded p-1 text-blue-300 transition-colors hover:bg-blue-900 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
