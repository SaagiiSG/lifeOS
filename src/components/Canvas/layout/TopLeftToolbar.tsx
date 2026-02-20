'use client'

import { useEditor, createShapeId } from 'tldraw'
import {
    Target,
    Video,
    Flame,
    MoreHorizontal,
    Plus,
    Settings,
    Trash2,
    Type,
    CheckSquare,
    Wallet,
    BarChart3,
    Layers,
    Lightbulb,
    BookOpen,
    Calendar,
    Users,
    ClipboardList,
    LayoutDashboard,
    CalendarDays,
    Network,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ToolItemProps {
    icon: React.ElementType
    label: string
    color: string
    onClick: () => void
    isActive?: boolean
}

function ToolItem({ icon: Icon, label, color, onClick, isActive }: ToolItemProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <ContextMenu>
                    <ContextMenuTrigger>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-xl bg-zinc-800/50 backdrop-blur-md transition-all duration-300 hover:bg-zinc-700 hover:scale-105 active:scale-95 ios-hover-glow",
                                "[transition-timing-function:var(--ease-spring)]",
                                isActive && "bg-zinc-700 ring-1 ring-zinc-600",
                                color
                            )}
                            onClick={onClick}
                        >
                            <Icon className="h-5 w-5" />
                        </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48 bg-zinc-900 border-zinc-800">
                        <ContextMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                            <Plus className="mr-2 h-4 w-4" /> Add {label}
                        </ContextMenuItem>
                        <ContextMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                            <Settings className="mr-2 h-4 w-4" /> {label} Settings
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-zinc-800" />
                        <ContextMenuItem className="text-red-400 focus:text-red-300 focus:bg-zinc-800">
                            <Trash2 className="mr-2 h-4 w-4" /> Remove from Toolbar
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export function TopLeftToolbar() {
    const editor = useEditor()

    const handleAddGoalNode = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
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
        })
        editor.select(id)
        editor.setEditingShape(id)
    }

    const handleAddGoalEcosystem = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
        const now = new Date()
        const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
        editor.createShape({
            id,
            type: 'goal-ecosystem-node' as 'geo',
            x: point.x - 450,
            y: point.y - 325,
            props: {
                w: 900,
                h: 650,
                title: 'New Goal',
                description: '',
                status: 'active',
                quarter: `Q${currentQuarter}`,
                year: now.getFullYear(),
                color: 'blue',
            },
        })
        editor.select(id)
        editor.setEditingShape(id)
    }

    const handleAddHabitDashboard = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
        editor.createShape({
            id,
            type: 'habit-dashboard-node' as 'geo',
            x: point.x - 280,
            y: point.y - 190,
            props: {
                w: 560,
                h: 380,
            },
        })
        editor.select(id)
    }

    const handleAddVideoEditorNode = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
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
        })
        editor.select(id)
    }

    const handleAddDailyPlannerNode = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
        const today = new Date().toISOString().split('T')[0]
        editor.createShape({
            id,
            type: 'daily-planner-node' as 'geo',
            x: point.x - 340,
            y: point.y - 210,
            props: {
                w: 680,
                h: 420,
                date: today,
                tasks: [],
                dailyWins: [
                    { id: 'physical', label: 'Physical Win', emoji: '', completed: false },
                    { id: 'mental', label: 'Mental Win', emoji: '', completed: false },
                    { id: 'spiritual', label: 'Spiritual Win', emoji: '', completed: false },
                    { id: 'accountability', label: 'Honest Accountability', emoji: '', completed: false },
                ],
            },
        })
        editor.select(id)
    }

    const addNodeAtCenter = (type: string, props: Record<string, unknown>) => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()
        const w = (props.w as number) || 200
        const h = (props.h as number) || 100
        editor.createShape({
            id,
            type: type as 'geo',
            x: point.x - w / 2,
            y: point.y - h / 2,
            props,
        })
        editor.select(id)
    }

    const moreTools = [
        {
            icon: Target,
            label: 'Goal Card',
            color: 'text-blue-400',
            action: handleAddGoalNode,
        },
        {
            icon: Type,
            label: 'Text',
            color: 'text-zinc-300',
            action: () => addNodeAtCenter('text-node', { w: 200, h: 100, text: '', color: 'white' }),
        },
        {
            icon: CheckSquare,
            label: 'Task',
            color: 'text-sky-400',
            action: () => addNodeAtCenter('task-node', { w: 160, h: 80, title: 'New Task', description: '', completed: false, dueDate: '', priority: 'medium', color: 'blue' }),
        },
        {
            icon: Wallet,
            label: 'Budget',
            color: 'text-emerald-400',
            action: () => addNodeAtCenter('budget-node', { w: 320, h: 400, monthlySalary: 0, currency: 'USD', expenses: [], monthlyHistory: [] }),
        },
        {
            icon: BarChart3,
            label: 'Chart',
            color: 'text-violet-400',
            action: () => addNodeAtCenter('chart-node', {
                w: 320, h: 220, title: 'New Chart', chartType: 'bar', viewMode: 'overall',
                data: [{ label: 'Mon', value: 30 }, { label: 'Tue', value: 45 }, { label: 'Wed', value: 60 }, { label: 'Thu', value: 35 }, { label: 'Fri', value: 80 }, { label: 'Sat', value: 55 }, { label: 'Sun', value: 40 }],
                color: 'violet',
            }),
        },
        {
            icon: Layers,
            label: 'Phase',
            color: 'text-amber-400',
            action: () => addNodeAtCenter('phase-node', { w: 300, h: 200, title: 'Phase 1', phaseIndex: 1 }),
        },
        {
            icon: Lightbulb,
            label: 'Content Idea',
            color: 'text-pink-400',
            action: () => addNodeAtCenter('content-idea-node', { w: 260, h: 180, title: 'New Content Idea', platform: 'instagram', caption: '', status: 'idea', scheduledDate: '', hashtags: [], color: 'pink' }),
        },
        {
            icon: BookOpen,
            label: 'Learning',
            color: 'text-cyan-400',
            action: () => addNodeAtCenter('learning-node', { w: 280, h: 160, title: 'New Resource', type: 'article', url: '', thumbnailUrl: '', notes: '', color: 'cyan' }),
        },
        {
            icon: Calendar,
            label: 'Calendar Event',
            color: 'text-sky-400',
            action: () => {
                const today = new Date().toISOString().split('T')[0]
                addNodeAtCenter('calendar-event-node', { w: 260, h: 160, title: 'New Event', description: '', startDate: today, endDate: today, startTime: '09:00', endTime: '10:00', location: '', isAllDay: false, isSynced: false, googleEventId: '', color: 'sky' })
            },
        },
        {
            icon: Users,
            label: 'Follower Count',
            color: 'text-pink-400',
            action: () => addNodeAtCenter('follower-count-node', { w: 240, h: 180, platform: 'instagram', username: '', currentCount: 0, previousCount: 0, lastSynced: '', history: [], color: 'pink' }),
        },
        {
            icon: Flame,
            label: 'Habit Tracker',
            color: 'text-orange-400',
            action: () => addNodeAtCenter('habit-node', { w: 340, h: 140, name: 'New Habit', color: 'green', checkIns: [] }),
        },
        {
            icon: CalendarDays,
            label: 'Content Calendar',
            color: 'text-pink-400',
            action: () => {
                const now = new Date()
                addNodeAtCenter('content-calendar-node', { w: 620, h: 480, viewMonth: now.getMonth(), viewYear: now.getFullYear(), entries: [] })
            },
        },
    ]

    return (
        <div className="absolute left-6 top-6 z-50 flex flex-col gap-3 ios-animate-in">
            <div className="flex flex-col gap-2 p-1.5 rounded-2xl glass-panel stagger-children">
                <ToolItem
                    icon={Network}
                    label="Goal Ecosystem"
                    color="text-blue-400 group-hover:text-blue-300"
                    onClick={handleAddGoalEcosystem}
                />
                <ToolItem
                    icon={LayoutDashboard}
                    label="Habits"
                    color="text-violet-400 group-hover:text-violet-300"
                    onClick={handleAddHabitDashboard}
                />
                <ToolItem
                    icon={Video}
                    label="Video Editor"
                    color="text-purple-400 group-hover:text-purple-300"
                    onClick={handleAddVideoEditorNode}
                />
                <ToolItem
                    icon={ClipboardList}
                    label="Daily Planner"
                    color="text-indigo-400 group-hover:text-indigo-300"
                    onClick={handleAddDailyPlannerNode}
                />

                <div className="mx-2 h-[1px] bg-white/10 my-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-full rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        className="z-[9999] w-52 bg-zinc-900 border-zinc-800"
                        onPointerDownOutside={(e) => e.stopPropagation()}
                    >
                        <DropdownMenuLabel className="text-zinc-500 text-xs uppercase tracking-wider">
                            Add Node
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        {moreTools.map((tool) => (
                            <DropdownMenuItem
                                key={tool.label}
                                onSelect={tool.action}
                                className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            >
                                <tool.icon className={cn("h-4 w-4 mr-2", tool.color)} />
                                {tool.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
