'use client'

import { useEditor, createShapeId } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Type, ZoomIn, ZoomOut, Maximize2, Target, Video, Flame, CheckSquare, ArrowRight,
  DollarSign, BookOpen, Lightbulb, BarChart3, Calendar, Users
} from 'lucide-react'

interface ToolbarProps {
  onConnectMode?: () => void
  isConnectMode?: boolean
}

export function Toolbar({ onConnectMode, isConnectMode }: ToolbarProps) {
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

  const handleAddHabitNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'habit-node',
      x: point.x - 120,
      y: point.y - 80,
      props: {
        w: 240,
        h: 160,
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
      x: point.x - 120,
      y: point.y - 60,
      props: {
        w: 240,
        h: 120,
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

  const handleAddBudgetNode = () => {
    const center = editor.getViewportScreenCenter()
    const point = editor.screenToPage(center)

    const id = createShapeId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.createShape({
      id,
      type: 'budget-node',
      x: point.x - 120,
      y: point.y - 70,
      props: {
        w: 240,
        h: 140,
        title: 'New Transaction',
        type: 'expense',
        amount: 0,
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        color: 'emerald',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    editor.select(id)
    editor.setEditingShape(id)
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
    <div className="absolute left-4 top-4 z-50 flex flex-col gap-2">
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

        <div className="my-1 h-px bg-zinc-700" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 transition-colors ${
                isConnectMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              onClick={onConnectMode}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Connect Nodes</p>
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
  )
}
