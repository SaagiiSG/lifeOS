'use client'

import { useEditor, useValue, createShapeId, TLShapeId } from 'tldraw'
import { Plus } from 'lucide-react'

const nodeTypes = [
  'text-node', 'goal-node', 'video-node', 'habit-node', 'task-node',
  'budget-node', 'learning-node', 'content-idea-node', 'chart-node',
  'calendar-event-node', 'follower-count-node'
]

interface ConnectionHandlesProps {
  onStartConnection: (sourceId: TLShapeId, anchor: string) => void
  pendingConnection: { sourceId: TLShapeId; anchor: string } | null
  onCompleteConnection: (targetId: TLShapeId, anchor: string) => void
  onCancelConnection: () => void
}

export function ConnectionHandles({
  onStartConnection,
  pendingConnection,
  onCompleteConnection,
  onCancelConnection,
}: ConnectionHandlesProps) {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected shape for handles',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      if (!shape || !nodeTypes.includes(shape.type as string)) return null
      return shape
    },
    [editor]
  )

  const viewport = useValue(
    'viewport',
    () => ({
      zoom: editor.getZoomLevel(),
      bounds: editor.getViewportScreenBounds(),
    }),
    [editor]
  )

  if (!selectedShape) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = selectedShape.props as any
  const w = props.w || 200
  const h = props.h || 100

  // Convert shape coordinates to screen coordinates
  const topLeft = editor.pageToViewport({ x: selectedShape.x, y: selectedShape.y })
  const zoom = viewport.zoom

  const handleSize = 24
  const handleOffset = -handleSize / 2

  const handles = [
    { anchor: 'top', x: topLeft.x + (w * zoom) / 2 + handleOffset, y: topLeft.y + handleOffset - 8 },
    { anchor: 'right', x: topLeft.x + w * zoom + handleOffset + 8, y: topLeft.y + (h * zoom) / 2 + handleOffset },
    { anchor: 'bottom', x: topLeft.x + (w * zoom) / 2 + handleOffset, y: topLeft.y + h * zoom + handleOffset + 8 },
    { anchor: 'left', x: topLeft.x + handleOffset - 8, y: topLeft.y + (h * zoom) / 2 + handleOffset },
  ]

  const handleClick = (anchor: string) => {
    if (pendingConnection) {
      // Complete the connection
      if (pendingConnection.sourceId !== selectedShape.id) {
        onCompleteConnection(selectedShape.id, anchor)
      }
    } else {
      // Start a new connection
      onStartConnection(selectedShape.id, anchor)
    }
  }

  const isPending = pendingConnection !== null
  const isSource = pendingConnection?.sourceId === selectedShape.id

  return (
    <>
      {handles.map(({ anchor, x, y }) => (
        <button
          key={anchor}
          className={`absolute z-[100] flex items-center justify-center rounded-full border-2 transition-all ${
            isPending && !isSource
              ? 'border-green-500 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white'
              : isSource && pendingConnection?.anchor === anchor
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-zinc-500 bg-zinc-900/90 text-zinc-400 hover:border-blue-500 hover:bg-blue-500/20 hover:text-blue-400'
          }`}
          style={{
            left: x,
            top: y,
            width: handleSize,
            height: handleSize,
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleClick(anchor)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title={isPending && !isSource ? `Connect here (${anchor})` : `Start connection from ${anchor}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      ))}

      {/* Cancel button when pending */}
      {isPending && isSource && (
        <button
          className="absolute z-[100] rounded-lg border border-red-500/50 bg-red-950/90 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900"
          style={{
            left: topLeft.x + (w * zoom) / 2 - 40,
            top: topLeft.y - 40,
          }}
          onClick={(e) => {
            e.stopPropagation()
            onCancelConnection()
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Cancel
        </button>
      )}

      {/* Instruction when pending */}
      {isPending && !isSource && (
        <div
          className="absolute z-[100] rounded-lg border border-green-500/50 bg-green-950/90 px-3 py-1.5 text-xs font-medium text-green-400"
          style={{
            left: topLeft.x + (w * zoom) / 2 - 60,
            top: topLeft.y - 40,
          }}
        >
          Click + to connect
        </div>
      )}
    </>
  )
}
