'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, useValue, TLShapeId, createShapeId, Vec } from 'tldraw'
import {
  CheckSquare,
  Layers,
  Target,
  Type,
  Flame,
} from 'lucide-react'

const nodeTypes = [
  'text-node', 'goal-node', 'video-node', 'habit-node', 'task-node',
  'budget-node', 'learning-node', 'content-idea-node', 'chart-node',
  'calendar-event-node', 'follower-count-node', 'daily-planner-node',
  'habit-dashboard-node', 'content-calendar-node',
  'phase-node',
]

interface DragState {
  isDragging: boolean
  sourceId: TLShapeId | null
  sourceAnchor: string | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  targetId: TLShapeId | null
  targetAnchor: string | null
}

interface DropMenu {
  screenX: number
  screenY: number
  sourceId: TLShapeId
  sourceAnchor: string
}

const dropMenuItems = [
  {
    type: 'task-node',
    label: 'Task',
    icon: CheckSquare,
    color: 'text-sky-400',
    defaultProps: { w: 160, h: 80, title: 'New Task', description: '', completed: false, dueDate: '', priority: 'medium', color: 'blue' },
  },
  {
    type: 'phase-node',
    label: 'Phase',
    icon: Layers,
    color: 'text-amber-400',
    defaultProps: { w: 300, h: 200, title: 'New Phase', phaseIndex: 1 },
  },
  {
    type: 'goal-node',
    label: 'Goal',
    icon: Target,
    color: 'text-blue-400',
    defaultProps: { w: 280, h: 200, title: 'New Goal', description: '', targetDate: '', progress: 0, status: 'active', color: 'blue', milestones: [], checkIns: [], quarter: '', rolledOverFrom: '' },
  },
  {
    type: 'text-node',
    label: 'Text',
    icon: Type,
    color: 'text-zinc-300',
    defaultProps: { w: 200, h: 100, text: '', color: 'white' },
  },
  {
    type: 'habit-node',
    label: 'Habit',
    icon: Flame,
    color: 'text-orange-400',
    defaultProps: { w: 340, h: 140, name: 'New Habit', color: 'green', checkIns: [] },
  },
]

export function ConnectionHandles() {
  const editor = useEditor()
  const [hoveredShapeId, setHoveredShapeId] = useState<TLShapeId | null>(null)
  const [dropMenu, setDropMenu] = useState<DropMenu | null>(null)
  const dropMenuRef = useRef<HTMLDivElement>(null)

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceId: null,
    sourceAnchor: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetId: null,
    targetAnchor: null,
  })

  // Track hovered shape with buffer
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragState.isDragging) return

      const point = editor.screenToPage({ x: e.clientX, y: e.clientY })
      const shape = editor.getShapeAtPoint(point, { hitInside: true, margin: 50 })

      if (shape && nodeTypes.includes(shape.type)) {
        setHoveredShapeId(shape.id)
      } else {
        setHoveredShapeId(null)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [editor, dragState.isDragging])

  // Dismiss drop menu on click outside or Escape
  useEffect(() => {
    if (!dropMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropMenuRef.current && !dropMenuRef.current.contains(e.target as Node)) {
        setDropMenu(null)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropMenu(null)
    }

    // Delay listener to avoid catching the mouseup that opened the menu
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleEscape)
    }, 50)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [dropMenu])

  const activeShapeId = dragState.isDragging ? dragState.sourceId : hoveredShapeId

  const activeShape = useValue(
    'active shape for handles',
    () => {
      if (!activeShapeId) return null
      return editor.getShape(activeShapeId)
    },
    [editor, activeShapeId]
  )

  const viewport = useValue(
    'viewport',
    () => ({
      zoom: editor.getZoomLevel(),
      bounds: editor.getViewportScreenBounds(),
    }),
    [editor]
  )

  const allNodeShapes = useValue(
    'all node shapes',
    () => {
      return editor.getCurrentPageShapes().filter(s => nodeTypes.includes(s.type as string))
    },
    [editor]
  )

  const findTargetNode = useCallback((screenX: number, screenY: number, excludeId: TLShapeId) => {
    const zoom = editor.getZoomLevel()

    // Collect all matching candidates, then pick the smallest (most specific) one
    const candidates: { id: TLShapeId; anchor: string; area: number }[] = []

    for (const shape of allNodeShapes) {
      if (shape.id === excludeId) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = shape.props as any
      const w = props.w || 200
      const h = props.h || 100

      const topLeft = editor.pageToViewport({ x: shape.x, y: shape.y })
      const bottomRight = {
        x: topLeft.x + w * zoom,
        y: topLeft.y + h * zoom,
      }

      const padding = 40
      if (
        screenX >= topLeft.x - padding &&
        screenX <= bottomRight.x + padding &&
        screenY >= topLeft.y - padding &&
        screenY <= bottomRight.y + padding
      ) {
        const centerX = topLeft.x + (w * zoom) / 2
        const centerY = topLeft.y + (h * zoom) / 2

        const dx = screenX - centerX
        const dy = screenY - centerY

        let anchor: string
        if (Math.abs(dx) > Math.abs(dy)) {
          anchor = dx > 0 ? 'right' : 'left'
        } else {
          anchor = dy > 0 ? 'bottom' : 'top'
        }

        candidates.push({ id: shape.id, anchor, area: w * h })
      }
    }

    if (candidates.length === 0) return null

    // Return the smallest node — prevents large containers (phases) from stealing hits from tasks inside them
    candidates.sort((a, b) => a.area - b.area)
    return candidates[0]
  }, [editor, allNodeShapes])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.sourceId) return

    const target = findTargetNode(e.clientX, e.clientY, dragState.sourceId)

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
      targetId: target?.id || null,
      targetAnchor: target?.anchor || null,
    }))
  }, [dragState.isDragging, dragState.sourceId, findTargetNode])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.sourceId || !dragState.sourceAnchor) {
      setDragState(prev => ({ ...prev, isDragging: false, sourceId: null }))
      return
    }

    const target = findTargetNode(e.clientX, e.clientY, dragState.sourceId)

    if (target) {
      const sourceShape = editor.getShape(dragState.sourceId)
      const targetShape = editor.getShape(target.id)

      if (sourceShape && targetShape) {
        const connectionId = createShapeId()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.createShape({
          id: connectionId,
          type: 'connection',
          x: Math.min(sourceShape.x, targetShape.x),
          y: Math.min(sourceShape.y, targetShape.y),
          props: {
            fromId: dragState.sourceId,
            toId: target.id,
            fromAnchor: dragState.sourceAnchor,
            toAnchor: target.anchor,
            color: (sourceShape.props as any).color || 'zinc',
            style: 'solid',
            label: '',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        // When connecting a task node to a daily planner, sync the date
        const srcType = sourceShape.type as string
        const tgtType = targetShape.type as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const srcProps = sourceShape.props as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgtProps = targetShape.props as any

        if (srcType === 'task-node' && tgtType === 'daily-planner-node') {
          const plannerDate = tgtProps.date as string
          editor.updateShape({
            id: sourceShape.id,
            type: 'task-node',
            props: { dueDate: plannerDate },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          // Register task in planner's dayTasks for the current date
          const existingDayTasks = (tgtProps.dayTasks || {}) as Record<string, string[]>
          const dayList = existingDayTasks[plannerDate] || []
          if (!dayList.includes(sourceShape.id as string)) {
            editor.updateShape({
              id: targetShape.id,
              type: 'daily-planner-node',
              props: { dayTasks: { ...existingDayTasks, [plannerDate]: [...dayList, sourceShape.id as string] } },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          }
        } else if (srcType === 'daily-planner-node' && tgtType === 'task-node') {
          const plannerDate = srcProps.date as string
          editor.updateShape({
            id: targetShape.id,
            type: 'task-node',
            props: { dueDate: plannerDate },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          // Register task in planner's dayTasks for the current date
          const existingDayTasks = (srcProps.dayTasks || {}) as Record<string, string[]>
          const dayList = existingDayTasks[plannerDate] || []
          if (!dayList.includes(targetShape.id as string)) {
            editor.updateShape({
              id: sourceShape.id,
              type: 'daily-planner-node',
              props: { dayTasks: { ...existingDayTasks, [plannerDate]: [...dayList, targetShape.id as string] } },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          }
        }

        editor.select(connectionId)
      }
    } else {
      // No target found — check if drag was long enough to show drop menu
      const dragDist = Math.hypot(
        e.clientX - dragState.startX,
        e.clientY - dragState.startY,
      )

      if (dragDist > 30) {
        setDropMenu({
          screenX: e.clientX,
          screenY: e.clientY,
          sourceId: dragState.sourceId,
          sourceAnchor: dragState.sourceAnchor,
        })
      }
    }

    setDragState({
      isDragging: false,
      sourceId: null,
      sourceAnchor: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      targetId: null,
      targetAnchor: null,
    })
  }, [dragState, findTargetNode, editor])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && dragState.isDragging) {
      setDragState(prev => ({ ...prev, isDragging: false, sourceId: null }))
    }
  }, [dragState.isDragging])

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp, handleKeyDown])

  // Handle creating a node from the drop menu
  const handleDropMenuSelect = useCallback((item: typeof dropMenuItems[number]) => {
    if (!dropMenu) return

    const pagePoint = editor.screenToPage({ x: dropMenu.screenX, y: dropMenu.screenY })
    const defaultW = (item.defaultProps as any).w || 200
    const defaultH = (item.defaultProps as any).h || 100

    const newNodeId = createShapeId()
    const connectionId = createShapeId()

    const sourceShape = editor.getShape(dropMenu.sourceId)
    const sourceColor = sourceShape ? (sourceShape.props as any).color || 'zinc' : 'zinc'

    // Determine best anchor for the new node based on source anchor
    const oppositeAnchor: Record<string, string> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }
    const toAnchor = oppositeAnchor[dropMenu.sourceAnchor] || 'left'

    // Create the new node centered on drop point
    editor.createShapes([
      {
        id: newNodeId,
        type: item.type as 'geo',
        x: pagePoint.x - defaultW / 2,
        y: pagePoint.y - defaultH / 2,
        props: {
          ...item.defaultProps,
          ...(item.defaultProps as any).color !== undefined ? {} : { color: sourceColor },
        },
      },
      {
        id: connectionId,
        type: 'connection' as 'geo',
        x: 0,
        y: 0,
        props: {
          fromId: dropMenu.sourceId,
          toId: newNodeId,
          fromAnchor: dropMenu.sourceAnchor,
          toAnchor,
          color: sourceColor,
          style: 'solid',
          label: '',
        },
      },
    ])

    editor.select(newNodeId)
    editor.setEditingShape(newNodeId)
    setDropMenu(null)
  }, [dropMenu, editor])

  if (!activeShape && !dropMenu) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = activeShape ? (activeShape.props as any) : null
  const w = props?.w || 200
  const h = props?.h || 100

  const topLeft = activeShape ? editor.pageToViewport({ x: activeShape.x, y: activeShape.y }) : { x: 0, y: 0 }
  const zoom = viewport.zoom

  const dotSize = 12
  const dotOffset = -dotSize / 2

  const handles = activeShape ? [
    { anchor: 'top', x: topLeft.x + (w * zoom) / 2 + dotOffset, y: topLeft.y + dotOffset - 6 },
    { anchor: 'right', x: topLeft.x + w * zoom + dotOffset + 6, y: topLeft.y + (h * zoom) / 2 + dotOffset },
    { anchor: 'bottom', x: topLeft.x + (w * zoom) / 2 + dotOffset, y: topLeft.y + h * zoom + dotOffset + 6 },
    { anchor: 'left', x: topLeft.x + dotOffset - 6, y: topLeft.y + (h * zoom) / 2 + dotOffset },
  ] : []

  const handlePointerDown = (e: React.PointerEvent, anchor: string) => {
    e.stopPropagation()
    e.preventDefault()

    // Dismiss any open drop menu
    setDropMenu(null)

    const handle = handles.find(h => h.anchor === anchor)
    if (!handle || !activeShape) return

    const startX = handle.x + dotSize / 2
    const startY = handle.y + dotSize / 2

    setDragState({
      isDragging: true,
      sourceId: activeShape.id,
      sourceAnchor: anchor,
      startX,
      startY,
      currentX: e.clientX,
      currentY: e.clientY,
      targetId: null,
      targetAnchor: null,
    })
  }

  const getTargetBounds = () => {
    if (!dragState.targetId) return null

    const targetShape = editor.getShape(dragState.targetId)
    if (!targetShape) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetProps = targetShape.props as any
    const targetW = targetProps.w || 200
    const targetH = targetProps.h || 100

    const targetTopLeft = editor.pageToViewport({ x: targetShape.x, y: targetShape.y })

    return {
      x: targetTopLeft.x,
      y: targetTopLeft.y,
      width: targetW * zoom,
      height: targetH * zoom,
    }
  }

  const targetBounds = dragState.isDragging ? getTargetBounds() : null

  const getPreviewPath = () => {
    if (!dragState.isDragging) return ''

    const start = new Vec(dragState.startX, dragState.startY)
    const end = new Vec(dragState.currentX, dragState.currentY)

    const dist = Vec.Dist(start, end)
    const controlDist = Math.min(dist * 0.5, 150)

    let cp1 = new Vec(start.x, start.y)
    let cp2 = new Vec(end.x, end.y)

    switch (dragState.sourceAnchor) {
      case 'top': cp1 = new Vec(start.x, start.y - controlDist); break
      case 'bottom': cp1 = new Vec(start.x, start.y + controlDist); break
      case 'left': cp1 = new Vec(start.x - controlDist, start.y); break
      case 'right': cp1 = new Vec(start.x + controlDist, start.y); break
    }

    if (dragState.targetAnchor) {
      switch (dragState.targetAnchor) {
        case 'top': cp2 = new Vec(end.x, end.y - controlDist); break
        case 'bottom': cp2 = new Vec(end.x, end.y + controlDist); break
        case 'left': cp2 = new Vec(end.x - controlDist, end.y); break
        case 'right': cp2 = new Vec(end.x + controlDist, end.y); break
      }
    } else {
      if (Math.abs(end.x - start.x) > Math.abs(end.y - start.y)) {
        cp2 = new Vec(end.x + (end.x > start.x ? -controlDist : controlDist), end.y)
      } else {
        cp2 = new Vec(end.x, end.y + (end.y > start.y ? -controlDist : controlDist))
      }
    }

    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
  }

  const previewColor = dragState.targetId ? '#a78bfa' : '#7c3aed'

  return (
    <>
      {/* Glowing dot connection handles */}
      {handles.map(({ anchor, x, y }) => {
        const isActive = dragState.isDragging && dragState.sourceAnchor === anchor
        return (
          <button
            key={anchor}
            className="absolute z-[100] flex items-center justify-center transition-all duration-200"
            style={{
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              cursor: 'crosshair',
            }}
            onPointerDown={(e) => handlePointerDown(e, anchor)}
            title={`Drag to connect from ${anchor}`}
          >
            {/* Outer glow */}
            <div
              className="absolute rounded-full transition-all duration-200"
              style={{
                width: isActive ? 20 : 12,
                height: isActive ? 20 : 12,
                background: isActive ? 'rgba(167, 139, 250, 0.3)' : 'rgba(124, 58, 237, 0.2)',
                filter: isActive ? 'blur(4px)' : 'blur(3px)',
              }}
            />
            {/* Core dot */}
            <div
              className="absolute rounded-full transition-all duration-200"
              style={{
                width: isActive ? 8 : 5,
                height: isActive ? 8 : 5,
                background: isActive ? '#a78bfa' : '#7c3aed',
                opacity: isActive ? 1 : 0.6,
                boxShadow: isActive
                  ? '0 0 8px rgba(167, 139, 250, 0.6)'
                  : '0 0 4px rgba(124, 58, 237, 0.3)',
              }}
            />
          </button>
        )
      })}

      {/* Drag preview - glow-style bezier */}
      {dragState.isDragging && (
        <svg
          className="pointer-events-none fixed inset-0 z-[99]"
          style={{ width: '100vw', height: '100vh' }}
        >
          <defs>
            <filter id="drag-glow-wide" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
            <filter id="drag-glow-anchor" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>

          {/* Wide glow layer */}
          <path
            d={getPreviewPath()}
            fill="none"
            stroke={previewColor}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.1}
            filter="url(#drag-glow-wide)"
          />

          {/* Medium glow layer */}
          <path
            d={getPreviewPath()}
            fill="none"
            stroke={previewColor}
            strokeWidth={4}
            strokeDasharray={dragState.targetId ? 'none' : '6 4'}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* Core line */}
          <path
            d={getPreviewPath()}
            fill="none"
            stroke={previewColor}
            strokeWidth={1.8}
            strokeDasharray={dragState.targetId ? 'none' : '6 4'}
            strokeLinecap="round"
            opacity={0.8}
          />

          {/* Start anchor glow */}
          <circle
            cx={dragState.startX}
            cy={dragState.startY}
            r={8}
            fill={previewColor}
            opacity={0.35}
            filter="url(#drag-glow-anchor)"
          />
          <circle
            cx={dragState.startX}
            cy={dragState.startY}
            r={3}
            fill={previewColor}
            opacity={0.9}
          />

          {/* End anchor glow */}
          <circle
            cx={dragState.currentX}
            cy={dragState.currentY}
            r={8}
            fill={previewColor}
            opacity={0.35}
            filter="url(#drag-glow-anchor)"
          />
          <circle
            cx={dragState.currentX}
            cy={dragState.currentY}
            r={3}
            fill={previewColor}
            opacity={0.9}
          />
        </svg>
      )}

      {/* Target node highlight - soft glow border */}
      {dragState.isDragging && targetBounds && (
        <div
          className="pointer-events-none absolute z-[98] rounded-xl"
          style={{
            left: targetBounds.x - 4,
            top: targetBounds.y - 4,
            width: targetBounds.width + 8,
            height: targetBounds.height + 8,
            border: '1px solid rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 20px rgba(167, 139, 250, 0.15), inset 0 0 20px rgba(167, 139, 250, 0.05)',
          }}
        />
      )}

      {/* Drag instruction tooltip */}
      {dragState.isDragging && (
        <div
          className="pointer-events-none absolute z-[100] rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            left: dragState.currentX + 16,
            top: dragState.currentY + 16,
            background: 'rgba(20, 20, 22, 0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: dragState.targetId ? '#a78bfa' : '#a1a1aa',
            boxShadow: dragState.targetId
              ? '0 0 12px rgba(167, 139, 250, 0.2)'
              : '0 0 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {dragState.targetId ? 'Release to connect' : 'Drag to a node'}
        </div>
      )}

      {/* Drop menu — appears when releasing on empty canvas */}
      {dropMenu && (
        <div
          ref={dropMenuRef}
          className="absolute z-[200] ios-animate-in"
          style={{
            left: dropMenu.screenX - 80,
            top: dropMenu.screenY - 10,
          }}
        >
          <div
            className="flex flex-col gap-0.5 rounded-xl border border-white/[0.08] p-1.5 shadow-2xl"
            style={{
              background: 'rgba(20, 20, 22, 0.85)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(167, 139, 250, 0.08)',
            }}
          >
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Create & Connect
            </div>
            {dropMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.type}
                  onClick={() => handleDropMenuSelect(item)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
