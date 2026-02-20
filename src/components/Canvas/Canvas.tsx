'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import {
  Tldraw,
  Editor,
  loadSnapshot,
  getSnapshot,
  useEditor,
  track,
  createShapeId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextNodeShapeUtil } from './shapes/TextNodeShape'
import { GoalNodeShapeUtil } from './shapes/GoalNodeShape'
import { VideoNodeShapeUtil } from './shapes/VideoNodeShape'
import { VideoEditorNodeShapeUtil } from './shapes/VideoEditorNodeShape'
import { HabitNodeShapeUtil } from './shapes/HabitNodeShape'
import { TaskNodeShapeUtil } from './shapes/TaskNodeShape'
import { ConnectionShapeUtil } from './shapes/ConnectionShape'
import { BudgetNodeShapeUtil } from './shapes/BudgetNodeShape'
import { LearningNodeShapeUtil } from './shapes/LearningNodeShape'
import { ContentIdeaNodeShapeUtil } from './shapes/ContentIdeaNodeShape'
import { ChartNodeShapeUtil } from './shapes/ChartNodeShape'
import { CalendarEventNodeShapeUtil } from './shapes/CalendarEventNodeShape'
import { FollowerCountNodeShapeUtil } from './shapes/FollowerCountNodeShape'
import { PhaseNodeShapeUtil } from './shapes/PhaseNodeShape'
import { TextGroupNodeShapeUtil } from './shapes/TextGroupNodeShape'
import { DailyPlannerNodeShapeUtil } from './shapes/DailyPlannerNodeShape'
import { HabitDashboardNodeShapeUtil } from './shapes/HabitDashboardNodeShape'
import { ContentCalendarNodeShapeUtil } from './shapes/ContentCalendarNodeShape'
import { GoalEcosystemNodeShapeUtil } from './shapes/GoalEcosystemNodeShape'
import { SelectionMenu } from './SelectionMenu'

const DOT_SPACING = 24

const DotGridBackground = track(function DotGridBackground() {
  const editor = useEditor()
  const camera = editor.getCamera()
  const zoom = camera.z

  const scaledSpacing = DOT_SPACING * zoom
  const offsetX = (camera.x * zoom) % scaledSpacing
  const offsetY = (camera.y * zoom) % scaledSpacing
  const dotSize = Math.max(0.5, 1 * zoom)

  useEffect(() => {
    const container = editor.getContainer()
    container.style.setProperty('--dot-size', `${dotSize}px`)
    container.style.setProperty('--dot-spacing', `${scaledSpacing}px`)
    container.style.setProperty('--dot-offset-x', `${offsetX}px`)
    container.style.setProperty('--dot-offset-y', `${offsetY}px`)
  })

  return null
})
import { TopLeftToolbar } from './layout/TopLeftToolbar'
import { BottomLeftSection } from './layout/BottomLeftSection'
import { TopRightSection } from './layout/TopRightSection'
import { NodeInfoDrawer } from './layout/NodeInfoDrawer'
import { VideoEditorPropertiesPanel } from './VideoEditorPropertiesPanel'
import { ConnectionHandles } from './ConnectionHandles'
import { Minimap } from './Minimap'
import { SearchPanel } from './SearchPanel'
import { QuickLogPanel } from './layout/QuickLogPanel'
import { PomodoroTimer } from './PomodoroTimer'
import { loadCanvas, saveCanvas, getStorageStatus, canvasLoadSucceeded } from '@/lib/canvas-storage'
import { useGoalSync } from '@/hooks/useGoalSync'
import { useHabitSync } from '@/hooks/useHabitSync'
import { useTaskSync } from '@/hooks/useTaskSync'

const SAVE_DEBOUNCE_MS = 500

// Default prop values for shape types that have been updated since shapes were last saved.
// This prevents tldraw validation errors when loading snapshots with missing new props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SHAPE_PROP_DEFAULTS: Record<string, Record<string, any>> = {
  'daily-planner-node': { dayTasks: {} },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchSnapshotDefaults(snapshot: any) {
  const store = snapshot?.document?.store || snapshot?.store
  if (!store || typeof store !== 'object') return

  for (const key of Object.keys(store)) {
    if (!key.startsWith('shape:')) continue
    const record = store[key]
    const defaults = SHAPE_PROP_DEFAULTS[record?.typeName === 'shape' ? record.type : '']
    if (!defaults || !record.props) continue

    for (const [prop, defaultValue] of Object.entries(defaults)) {
      if (!(prop in record.props)) {
        record.props[prop] = defaultValue
      }
    }
  }
}

const customShapeUtils = [
  TextNodeShapeUtil,
  GoalNodeShapeUtil,
  VideoNodeShapeUtil,
  VideoEditorNodeShapeUtil,
  HabitNodeShapeUtil,
  TaskNodeShapeUtil,
  ConnectionShapeUtil,
  BudgetNodeShapeUtil,
  LearningNodeShapeUtil,
  ContentIdeaNodeShapeUtil,
  ChartNodeShapeUtil,
  CalendarEventNodeShapeUtil,
  FollowerCountNodeShapeUtil,
  PhaseNodeShapeUtil,
  TextGroupNodeShapeUtil,
  DailyPlannerNodeShapeUtil,
  HabitDashboardNodeShapeUtil,
  ContentCalendarNodeShapeUtil,
  GoalEcosystemNodeShapeUtil,
]

export function Canvas() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [storageType, setStorageType] = useState<'supabase' | 'local'>('local')
  const [isLoading, setIsLoading] = useState(true)
  const [shapeCount, setShapeCount] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSnapshotRef = useRef<string | null>(null)
  const hasLoadedInitialSnapshotRef = useRef(false)

  // Sync goals to Supabase
  useGoalSync(editor)
  // Sync habits to Supabase
  useHabitSync(editor)
  // Sync tasks to Supabase
  useTaskSync(editor)

  // Load saved data on mount
  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor)
    setStorageType(getStorageStatus())
    hasLoadedInitialSnapshotRef.current = false

    // Load canvas data asynchronously
    loadCanvas()
      .then((snapshot) => {
        if (snapshot) {
          // Patch existing shapes to include props added after initial save
          // This prevents tldraw validation errors when new props are added to shape utils
          patchSnapshotDefaults(snapshot)
          loadSnapshot(editor.store, snapshot)
          setLastSavedAt(new Date().toISOString())
        }
        if (!canvasLoadSucceeded) {
          setLoadFailed(true)
          console.warn('[LifeOS] Load did not succeed — auto-save is disabled')
        }
      })
      .catch((error) => {
        console.error('Failed to load canvas data:', error)
        setLoadFailed(true)
      })
      .finally(() => {
        hasLoadedInitialSnapshotRef.current = true
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
      const saved = await saveCanvas(snapshot)
      if (saved) {
        setLastSavedAt(new Date().toISOString())
        // Count shapes for status display
        const store = snapshot?.document?.store || snapshot?.store || {}
        setShapeCount(Object.keys(store).filter((k: string) => k.startsWith('shape:')).length)
      }
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
      // Prevent saving an empty/default snapshot before we've attempted to load persisted data.
      if (!hasLoadedInitialSnapshotRef.current) return
      // If load failed, block all saves to prevent data loss.
      if (!canvasLoadSucceeded) return

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

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs or when tldraw is in editing mode
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (editor.getEditingShapeId()) return

      if (e.key === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
        editor.createShape({
          id,
          type: 'task-node' as 'geo',
          x: point.x - 80,
          y: point.y - 40,
          props: { w: 160, h: 80, title: 'New Task', description: '', completed: false, dueDate: '', priority: 'medium', color: 'blue' },
        })
        editor.select(id)
        editor.setEditingShape(id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative h-full w-full">
        <style jsx global>{`
          .tl-background {
            background-color: #0a0a0a !important;
            background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) var(--dot-size, 1px), transparent var(--dot-size, 1px)) !important;
            background-size: var(--dot-spacing, 24px) var(--dot-spacing, 24px) !important;
            background-position: var(--dot-offset-x, 0px) var(--dot-offset-y, 0px) !important;
          }
          .tl-canvas {
            background-color: transparent !important;
          }
          /* Hide default tldraw UI */
          .tlui-layout__top,
          .tlui-layout__bottom {
            display: none !important;
          }
          /* Grid styling */
          .tl-grid {
            opacity: 0 !important;
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
          <DotGridBackground />
          <TopLeftToolbar />
          <TopRightSection onSearchClick={() => setIsSearchOpen(true)} />
          <BottomLeftSection
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            storageType={storageType}
            shapeCount={shapeCount}
            loadFailed={loadFailed}
          />
          <NodeInfoDrawer />
          <VideoEditorPropertiesPanel />
          <ConnectionHandles />
          <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          <Minimap />
          <SelectionMenu />
          <PomodoroTimer />
          <QuickLogPanel
            isOpen={isQuickLogOpen}
            onOpen={() => setIsQuickLogOpen(true)}
            onClose={() => setIsQuickLogOpen(false)}
          />
        </Tldraw>
      </div>
    </TooltipProvider>
  )
}
