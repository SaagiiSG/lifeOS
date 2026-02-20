'use client'

import { useEditor, createShapeId } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Type, ZoomIn, ZoomOut, Maximize2, Target, Video, Flame, CheckSquare,
  DollarSign, BookOpen, Lightbulb, BarChart3, Calendar, Users, Scissors, Layers,
  CalendarCheck, LayoutDashboard, CalendarDays
} from 'lucide-react'
import { UserMenu } from '@/components/auth/UserMenu'

export function Toolbar() {
  const editor = useEditor()

  const handleAddTextNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'text-node',
      x: point.x - 100,
      y: point.y - 50,
      props: {
        w: 200,
        h: 100,
        text: '',
        color: 'white',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddGoalNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'goal-node',
      x: point.x - 140,
      y: point.y - 100,
      props: {
        w: 280,
        h: 200,
        title: 'New Goal',
        description: '',
        targetDate: '',
        progress: 0,
        status: 'active',
        color: 'blue',
        milestones: [],
        checkIns: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddVideoNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'video-node',
      x: point.x - 160,
      y: point.y - 120,
      props: {
        w: 320,
        h: 240,
        title: 'New Video',
        status: 'empty',
        sourceUrl: '',
        outputUrl: '',
        thumbnailUrl: '',
        duration: 0,
        fileSize: 0,
        uploadProgress: 0,
        processingProgress: 0,
        error: '',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
  }

  const handleAddVideoEditorNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'video-editor-node',
      x: point.x - 180,
      y: point.y - 320,
      props: {
        w: 360,
        h: 640,
        title: 'Video Editor',
        status: 'empty',
        sourceUrl: '',
        outputUrl: '',
        thumbnailUrl: '',
        duration: 0,
        fileSize: 0,
        uploadProgress: 0,
        processingProgress: 0,
        error: '',
        englishCaptionsUrl: '',
        mongolianCaptionsUrl: '',
        transcriptUrl: '',
        isEditorOpen: false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
  }

  const handleAddHabitNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'habit-node',
      x: point.x - 170,
      y: point.y - 70,
      props: {
        w: 340,
        h: 140,
        name: 'New Habit',
        color: 'green',
        checkIns: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddTaskNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'task-node',
      x: point.x - 80,
      y: point.y - 40,
      props: {
        w: 160,
        h: 80,
        title: 'New Task',
        description: '',
        completed: false,
        dueDate: '',
        priority: 'medium',
        color: 'blue',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddDailyPlannerNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'daily-planner-node',
      x: point.x - 340,
      y: point.y - 210,
      props: {
        w: 680,
        h: 420,
        date: new Date().toISOString().split('T')[0],
        tasks: [],
        dailyWins: [
          { id: 'physical', label: 'Physical Win', emoji: '', completed: false },
          { id: 'mental', label: 'Mental Win', emoji: '', completed: false },
          { id: 'spiritual', label: 'Spiritual Win', emoji: '', completed: false },
          { id: 'accountability', label: 'Honest Accountability', emoji: '', completed: false },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddBudgetNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'budget-node',
      x: point.x - 160,
      y: point.y - 200,
      props: {
        w: 320,
        h: 400,
        monthlySalary: 0,
        currency: 'USD',
        expenses: [],
        monthlyHistory: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
  }

  const handleAddLearningNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'learning-node',
      x: point.x - 140,
      y: point.y - 80,
      props: {
        w: 280,
        h: 160,
        title: 'New Resource',
        type: 'article',
        url: '',
        thumbnailUrl: '',
        notes: '',
        color: 'cyan',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddContentIdeaNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'content-idea-node',
      x: point.x - 130,
      y: point.y - 90,
      props: {
        w: 260,
        h: 180,
        title: 'New Content Idea',
        platform: 'instagram',
        caption: '',
        status: 'idea',
        scheduledDate: '',
        hashtags: [],
        color: 'pink',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddChartNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'chart-node',
      x: point.x - 160,
      y: point.y - 110,
      props: {
        w: 320,
        h: 220,
        title: 'New Chart',
        chartType: 'bar',
        data: [
          { label: 'Mon', value: 30 },
          { label: 'Tue', value: 45 },
          { label: 'Wed', value: 60 },
          { label: 'Thu', value: 35 },
          { label: 'Fri', value: 80 },
          { label: 'Sat', value: 55 },
          { label: 'Sun', value: 40 },
        ],
        color: 'violet',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddCalendarNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)
    const today = new Date()

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'calendar-event-node',
      x: point.x - 130,
      y: point.y - 80,
      props: {
        w: 260,
        h: 160,
        title: 'New Event',
        description: '',
        startDate: today.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        isAllDay: false,
        isSynced: false,
        googleEventId: '',
        color: 'sky',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddFollowerNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'follower-count-node',
      x: point.x - 120,
      y: point.y - 90,
      props: {
        w: 240,
        h: 180,
        platform: 'instagram',
        username: '',
        currentCount: 0,
        previousCount: 0,
        lastSynced: '',
        history: [],
        color: 'pink',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddContentCalendarNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const now = new Date()
    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'content-calendar-node',
      x: point.x - 310,
      y: point.y - 240,
      props: {
        w: 620,
        h: 480,
        viewMonth: now.getMonth(),
        viewYear: now.getFullYear(),
        entries: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
  }

  const handleAddHabitDashboardNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'habit-dashboard-node',
      x: point.x - 280,
      y: point.y - 190,
      props: {
        w: 560,
        h: 380,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
  }

  const handleGroupIntoPhase = () => {
    const selectedIds = editor.getSelectedShapeIds()
    if (selectedIds.length === 0) return

    // Filter for task nodes
    const taskShapes = selectedIds.map(id => editor.getShape(id)).filter(s => s && (s as any).type === 'task-node')
    if (taskShapes.length === 0) return

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    taskShapes.forEach(shape => {
      if (!shape) return
      const bounds = editor.getShapePageBounds(shape.id)
      if (!bounds) return
      minX = Math.min(minX, bounds.minX)
      minY = Math.min(minY, bounds.minY)
      maxX = Math.max(maxX, bounds.maxX)
      maxY = Math.max(maxY, bounds.maxY)
    })

    if (minX === Infinity) return

    // Add padding
    const padding = 60
    const x = minX - padding
    const y = minY - padding - 40 // Extra top padding for header
    const w = (maxX - minX) + (padding * 2)
    const h = (maxY - minY) + (padding * 2) + 40

    const id = createShapeId()

    // Determine phase index (count existing phases + 1)
    const existingPhases = editor.getCurrentPageShapes().filter(s => (s as any).type === 'phase-node')
    const nextIndex = existingPhases.length + 1

    editor.createShape({
      id,
      type: 'phase-node',
      x,
      y,
      props: {
        w,
        h,
        title: `Phase ${nextIndex}`,
        phaseIndex: nextIndex,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Send to back so tasks are visible on top
    editor.sendToBack([id])

    // Select the new phase
    editor.select(id)
  }

  const handleZoomIn = () => {
    editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
  }

  const handleZoomOut = () => {
    editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
  }

  const handleZoomToFit = () => {
    editor.zoomToFit({ animation: { duration: 200 } })
  }

  return (
    <>
      {/* User Menu - Top Right */}
      <div className="absolute right-4 top-4 z-50">
        <UserMenu />
      </div>

      <div className="absolute left-4 top-4 z-50 flex max-h-[calc(100vh-2rem)] flex-col gap-2 overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {/* Node Tools */}
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-900/90 p-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddTextNode}
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Text Node</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddGoalNode}
              >
                <Target className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Goal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddVideoNode}
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Video</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-purple-400 hover:bg-zinc-800 hover:text-purple-300"
                onClick={handleAddVideoEditorNode}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Video Editor</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddHabitNode}
              >
                <Flame className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Habit</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddTaskNode}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Task</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300"
                onClick={handleAddDailyPlannerNode}
              >
                <CalendarCheck className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Daily Planner</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* More Node Tools */}
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-900/90 p-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddBudgetNode}
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Budget Item</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddLearningNode}
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Learning Resource</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddContentIdeaNode}
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Content Idea</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddChartNode}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Chart</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddCalendarNode}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Calendar Event</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleAddFollowerNode}
              >
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Follower Count</p>
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-[1px] bg-zinc-700/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-blue-400 hover:bg-zinc-800 hover:text-blue-300"
                onClick={handleGroupIntoPhase}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Group Tasks into Phase</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Dashboard Tools */}
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-900/90 p-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-violet-400 hover:bg-zinc-800 hover:text-violet-300"
                onClick={handleAddHabitDashboardNode}
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Habit Dashboard</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-pink-400 hover:bg-zinc-800 hover:text-pink-300"
                onClick={handleAddContentCalendarNode}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Content Calendar</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Zoom Tools */}
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-900/90 p-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleZoomToFit}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom to Fit</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  )
}
