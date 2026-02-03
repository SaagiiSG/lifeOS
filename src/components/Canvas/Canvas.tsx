'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import {
  Tldraw,
  Editor,
  loadSnapshot,
  getSnapshot,
  TLShapeId,
  useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextNodeShapeUtil } from './shapes/TextNodeShape'
import { GoalNodeShapeUtil } from './shapes/GoalNodeShape'
import { VideoNodeShapeUtil } from './shapes/VideoNodeShape'
import { HabitNodeShapeUtil } from './shapes/HabitNodeShape'
import { TaskNodeShapeUtil } from './shapes/TaskNodeShape'
import { ConnectionShapeUtil } from './shapes/ConnectionShape'
import { BudgetNodeShapeUtil } from './shapes/BudgetNodeShape'
import { LearningNodeShapeUtil } from './shapes/LearningNodeShape'
import { ContentIdeaNodeShapeUtil } from './shapes/ContentIdeaNodeShape'
import { ChartNodeShapeUtil } from './shapes/ChartNodeShape'
import { CalendarEventNodeShapeUtil } from './shapes/CalendarEventNodeShape'
import { FollowerCountNodeShapeUtil } from './shapes/FollowerCountNodeShape'
import { Toolbar } from './Toolbar'
import { PropertiesPanel } from './PropertiesPanel'
import { GoalPropertiesPanel } from './GoalPropertiesPanel'
import { VideoPropertiesPanel } from './VideoPropertiesPanel'
import { HabitPropertiesPanel } from './HabitPropertiesPanel'
import { TaskPropertiesPanel } from './TaskPropertiesPanel'
import { ConnectionPropertiesPanel } from './ConnectionPropertiesPanel'
import { ConnectionMode } from './ConnectionMode'
import { ConnectionHandles } from './ConnectionHandles'
import { Minimap } from './Minimap'
import { SearchPanel } from './SearchPanel'
import { StatusBar } from './StatusBar'
import { loadCanvas, saveCanvas, getStorageStatus } from '@/lib/canvas-storage'
import { createShapeId } from 'tldraw'

const SAVE_DEBOUNCE_MS = 500

// Wrapper component for ConnectionHandles that has access to editor context
function ConnectionHandlesWrapper({
  pendingConnection,
  setPendingConnection,
}: {
  pendingConnection: { sourceId: TLShapeId; anchor: string } | null
  setPendingConnection: (conn: { sourceId: TLShapeId; anchor: string } | null) => void
}) {
  const editor = useEditor()

  const handleStartConnection = (sourceId: TLShapeId, anchor: string) => {
    setPendingConnection({ sourceId, anchor })
  }

  const handleCompleteConnection = (targetId: TLShapeId, targetAnchor: string) => {
    if (!pendingConnection) return

    const sourceShape = editor.getShape(pendingConnection.sourceId)
    const targetShape = editor.getShape(targetId)

    if (!sourceShape || !targetShape) {
      setPendingConnection(null)
      return
    }

    // Create the connection
    const connectionId = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id: connectionId,
      type: 'connection',
      x: Math.min(sourceShape.x, targetShape.x),
      y: Math.min(sourceShape.y, targetShape.y),
      props: {
        fromId: pendingConnection.sourceId,
        toId: targetId,
        fromAnchor: pendingConnection.anchor,
        toAnchor: targetAnchor,
        color: 'zinc',
        style: 'solid',
        label: '',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(connectionId)
    setPendingConnection(null)
  }

  const handleCancelConnection = () => {
    setPendingConnection(null)
  }

  return (
    <ConnectionHandles
      onStartConnection={handleStartConnection}
      pendingConnection={pendingConnection}
      onCompleteConnection={handleCompleteConnection}
      onCancelConnection={handleCancelConnection}
    />
  )
}

const customShapeUtils = [
  TextNodeShapeUtil,
  GoalNodeShapeUtil,
  VideoNodeShapeUtil,
  HabitNodeShapeUtil,
  TaskNodeShapeUtil,
  ConnectionShapeUtil,
  BudgetNodeShapeUtil,
  LearningNodeShapeUtil,
  ContentIdeaNodeShapeUtil,
  ChartNodeShapeUtil,
  CalendarEventNodeShapeUtil,
  FollowerCountNodeShapeUtil,
]

export function Canvas() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [storageType, setStorageType] = useState<'supabase' | 'local'>('local')
  const [isLoading, setIsLoading] = useState(true)
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [connectionSourceId, setConnectionSourceId] = useState<TLShapeId | null>(null)
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: TLShapeId; anchor: string } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSnapshotRef = useRef<string | null>(null)

  // Load saved data on mount
  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor)
    setStorageType(getStorageStatus())

    // Load canvas data asynchronously
    loadCanvas()
      .then((snapshot) => {
        if (snapshot) {
          loadSnapshot(editor.store, snapshot)
          setLastSavedAt(new Date().toISOString())
        }
      })
      .catch((error) => {
        console.error('Failed to load canvas data:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!editor) return

    const snapshot = getSnapshot(editor.store)
    const snapshotString = JSON.stringify(snapshot)

    // Skip if nothing changed
    if (snapshotString === lastSnapshotRef.current) {
      return
    }

    setIsSaving(true)
    lastSnapshotRef.current = snapshotString

    try {
      await saveCanvas(snapshot)
      setLastSavedAt(new Date().toISOString())
    } catch (error) {
      console.error('Failed to save canvas data:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editor])

  // Subscribe to store changes
  useEffect(() => {
    if (!editor) return

    const schedulesSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(debouncedSave, SAVE_DEBOUNCE_MS)
    }

    const unsubscribe = editor.store.listen(schedulesSave, {
      scope: 'document',
      source: 'user',
    })

    return () => {
      unsubscribe()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, debouncedSave])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative h-full w-full">
        <style jsx global>{`
          .tl-background {
            background-color: #0a0a0a !important;
          }
          .tl-canvas {
            background-color: #0a0a0a !important;
          }
          /* Hide default tldraw UI */
          .tlui-layout__top,
          .tlui-layout__bottom {
            display: none !important;
          }
          /* Grid styling */
          .tl-grid {
            opacity: 0.3 !important;
          }
        `}</style>

        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
              <span className="text-sm text-zinc-400">Loading canvas...</span>
            </div>
          </div>
        )}

        <Tldraw
          shapeUtils={customShapeUtils}
          onMount={handleMount}
          hideUi
          inferDarkMode
        >
          <Toolbar
            onConnectMode={() => setIsConnectMode(!isConnectMode)}
            isConnectMode={isConnectMode}
          />
          <PropertiesPanel />
          <GoalPropertiesPanel />
          <VideoPropertiesPanel />
          <HabitPropertiesPanel />
          <TaskPropertiesPanel />
          <ConnectionPropertiesPanel />
          <ConnectionMode
            isActive={isConnectMode}
            onClose={() => setIsConnectMode(false)}
            sourceId={connectionSourceId}
            setSourceId={setConnectionSourceId}
          />
          <ConnectionHandlesWrapper
            pendingConnection={pendingConnection}
            setPendingConnection={setPendingConnection}
          />
          <SearchPanel />
          <Minimap />
          <StatusBar
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            storageType={storageType}
          />
        </Tldraw>
      </div>
    </TooltipProvider>
  )
}
