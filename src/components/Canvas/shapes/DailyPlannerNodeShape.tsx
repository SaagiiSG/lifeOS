'use client'

import {
    ShapeUtil,
    HTMLContainer,
    TLBaseShape,
    T,
    RecordPropsType,
    Rectangle2d,
    resizeBox,
    TLShapeId,
} from 'tldraw'

const dailyPlannerNodeShapeProps = {
    w: T.number,
    h: T.number,
    date: T.string,
    dayTasks: T.dict(T.string, T.arrayOf(T.string)),
    tasks: T.arrayOf(
        T.object({
            id: T.string,
            title: T.string,
            completed: T.boolean,
            rolledOver: T.boolean,
        })
    ),
    dailyWins: T.arrayOf(
        T.object({
            id: T.string,
            label: T.string,
            emoji: T.string,
            completed: T.boolean,
        })
    ),
}

type DailyPlannerNodeShapeProps = RecordPropsType<typeof dailyPlannerNodeShapeProps>

export type DailyPlannerNodeShape = TLBaseShape<'daily-planner-node', DailyPlannerNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class DailyPlannerNodeShapeUtil extends ShapeUtil<any> {
    static override type = 'daily-planner-node' as const
    static override props = dailyPlannerNodeShapeProps

    getDefaultProps(): DailyPlannerNodeShapeProps {
        const today = new Date().toISOString().split('T')[0]
        return {
            w: 680,
            h: 420,
            date: today,
            dayTasks: {} as Record<string, string[]>,
            tasks: [],
            dailyWins: [
                { id: 'physical', label: 'Physical Win', emoji: '', completed: false },
                { id: 'mental', label: 'Mental Win', emoji: '', completed: false },
                { id: 'spiritual', label: 'Spiritual Win', emoji: '', completed: false },
                { id: 'accountability', label: 'Honest Accountability', emoji: '', completed: false },
            ],
        }
    }

    getGeometry(shape: DailyPlannerNodeShape) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        })
    }

    // Find task nodes connected to this planner via connection shapes, filtered by current date
    private getLinkedTaskNodes(shapeId: string, currentDate: string) {
        const connections = this.editor.getCurrentPageShapes().filter(
            s => (s.type as string) === 'connection'
        )

        const plannerShape = this.editor.getShape(shapeId as TLShapeId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dayTasksMap = (plannerShape?.props as any)?.dayTasks as Record<string, string[]> | undefined
        const dayTaskIds = dayTasksMap?.[currentDate] || []

        const linkedTaskIds: string[] = []
        for (const conn of connections) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const props = conn.props as any
            if (props.fromId === shapeId && this.isTaskNode(props.toId)) {
                linkedTaskIds.push(props.toId)
            } else if (props.toId === shapeId && this.isTaskNode(props.fromId)) {
                linkedTaskIds.push(props.fromId)
            }
        }

        // Build a set of ALL task IDs that are registered to ANY date in dayTasks
        const allRegisteredTaskIds = new Set<string>()
        if (dayTasksMap) {
            for (const ids of Object.values(dayTasksMap)) {
                for (const id of ids) allRegisteredTaskIds.add(id)
            }
        }

        // Filter tasks for the current date:
        // 1. Task's dueDate matches current date
        // 2. Task is in dayTasks[currentDate]
        // 3. Task is unregistered (not in ANY day) — adopt it into current date
        const filteredIds: string[] = []
        const tasksToAdopt: string[] = []

        for (const id of linkedTaskIds) {
            const shape = this.editor.getShape(id as TLShapeId)
            if (!shape) continue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = shape.props as any

            if (p.dueDate === currentDate || dayTaskIds.includes(id)) {
                filteredIds.push(id)
            } else if (!p.dueDate && !allRegisteredTaskIds.has(id)) {
                // Unregistered task with no dueDate — adopt into current date
                filteredIds.push(id)
                tasksToAdopt.push(id)
            }
        }

        // Auto-register matching tasks into dayTasks and set dueDate on adopted tasks
        const newDayTaskIds = [...dayTaskIds]
        let changed = false
        for (const id of filteredIds) {
            if (!newDayTaskIds.includes(id)) {
                newDayTaskIds.push(id)
                changed = true
            }
        }
        // Set dueDate on adopted tasks so they stick to this date
        for (const id of tasksToAdopt) {
            this.editor.updateShape({
                id,
                type: 'task-node',
                props: { dueDate: currentDate },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }
        if (changed && plannerShape) {
            const updatedDayTasks = { ...dayTasksMap, [currentDate]: newDayTaskIds }
            this.editor.updateShape({
                id: shapeId,
                type: 'daily-planner-node',
                props: { dayTasks: updatedDayTasks },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        return filteredIds.map(id => {
            const shape = this.editor.getShape(id as TLShapeId)
            if (!shape) return null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = shape.props as any
            return {
                nodeId: id,
                title: p.title || 'Untitled',
                completed: !!p.completed,
                priority: p.priority || 'medium',
                color: p.color || 'blue',
            }
        }).filter(Boolean) as Array<{
            nodeId: string
            title: string
            completed: boolean
            priority: string
            color: string
        }>
    }

    private isTaskNode(id: string): boolean {
        const shape = this.editor.getShape(id as TLShapeId)
        return !!shape && (shape.type as string) === 'task-node'
    }

    component(shape: DailyPlannerNodeShape) {
        const { date, tasks, dailyWins } = shape.props
        const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
        const isEditing = this.editor.getEditingShapeId() === shape.id

        // Get task nodes connected via connection shapes, filtered by current date
        const linkedTasks = this.getLinkedTaskNodes(shape.id, date)

        // Format display date
        const displayDate = (() => {
            try {
                const d = new Date(date + 'T00:00:00')
                const today = new Date()
                const todayStr = today.toISOString().split('T')[0]
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                const yesterdayStr = yesterday.toISOString().split('T')[0]

                let label = ''
                if (date === todayStr) label = 'Today'
                else if (date === yesterdayStr) label = 'Yesterday'

                const formatted = d.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })
                return label ? `${label} — ${formatted}` : formatted
            } catch {
                return date
            }
        })()

        // Toggle completion on the original task node
        const toggleLinkedTask = (nodeId: string) => {
            const taskShape = this.editor.getShape(nodeId as TLShapeId)
            if (!taskShape) return
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = taskShape.props as any
            this.editor.updateShape({
                id: nodeId,
                type: 'task-node',
                props: { completed: !p.completed },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Count completed tasks (inline + linked)
        const allTasks = [
            ...tasks.map(t => ({ ...t, isLinked: false, nodeId: '' })),
            ...linkedTasks.map(t => ({ id: t.nodeId, title: t.title, completed: t.completed, rolledOver: false, isLinked: true, nodeId: t.nodeId })),
        ]
        const completedTasks = allTasks.filter((t) => t.completed).length
        const totalTasks = allTasks.length

        // Count completed wins
        const completedWins = dailyWins.filter((w) => w.completed).length

        // Toggle task completion
        const toggleTask = (taskId: string) => {
            const newTasks = tasks.map((t) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
            )
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { tasks: newTasks },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Toggle daily win
        const toggleWin = (winId: string) => {
            const newWins = dailyWins.map((w) =>
                w.id === winId ? { ...w, completed: !w.completed } : w
            )
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { dailyWins: newWins },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Add new task
        const addTask = () => {
            const newTask = {
                id: `task-${Date.now()}`,
                title: '',
                completed: false,
                rolledOver: false,
            }
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { tasks: [...tasks, newTask] },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Update task title
        const updateTaskTitle = (taskId: string, title: string) => {
            const newTasks = tasks.map((t) =>
                t.id === taskId ? { ...t, title } : t
            )
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { tasks: newTasks },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Delete task
        const deleteTask = (taskId: string) => {
            const newTasks = tasks.filter((t) => t.id !== taskId)
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { tasks: newTasks },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        // Navigate date (cannot go past today)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const isToday = date === todayStr

        const changeDate = (offset: number) => {
            const current = new Date(date + 'T00:00:00')
            current.setDate(current.getDate() + offset)
            const y = current.getFullYear()
            const m = String(current.getMonth() + 1).padStart(2, '0')
            const d = String(current.getDate()).padStart(2, '0')
            const newDate = `${y}-${m}-${d}`
            if (newDate > todayStr) return
            this.editor.updateShape({
                id: shape.id,
                type: 'daily-planner-node',
                props: { date: newDate },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
        }

        return (
            <HTMLContainer
                id={shape.id}
                style={{
                    width: shape.props.w,
                    height: shape.props.h,
                }}
            >
                <div
                    className={`flex h-full w-full flex-col rounded-2xl border transition-all ${isSelected
                        ? 'border-indigo-500/60 ring-2 ring-indigo-500/20 ring-offset-0'
                        : 'border-white/[0.08]'
                        }`}
                    style={{
                        pointerEvents: 'all',
                        background: 'rgba(14, 14, 16, 0.7)',
                        backgroundImage:
                            'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 50%, rgba(255,255,255,0.015) 100%)',
                        boxShadow:
                            '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.04)',
                        fontFamily: 'var(--font-outfit)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => changeDate(-1)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                            >
                                ‹
                            </button>
                            <h2 className="text-sm font-semibold text-white tracking-wide">
                                {displayDate}
                            </h2>
                            <button
                                onClick={() => changeDate(1)}
                                onPointerDown={(e) => e.stopPropagation()}
                                disabled={isToday}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isToday ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                            >
                                ›
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>
                                {completedTasks}/{totalTasks} tasks
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span>
                                {completedWins}/4 wins
                            </span>
                        </div>
                    </div>

                    {/* Three Column Layout: 35% | 35% | 30% */}
                    <div className="flex flex-1 min-h-0">
                        {/* LEFT: Daily Tasks (35%) */}
                        <div className="flex flex-col border-r border-white/[0.06]" style={{ width: '35%' }}>
                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                                    Tasks
                                </span>
                                <button
                                    onClick={addTask}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-400"
                                >
                                    +
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                                {tasks.length === 0 && linkedTasks.length === 0 && (
                                    <button
                                        onClick={addTask}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-full py-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-center"
                                    >
                                        + Add your first task
                                    </button>
                                )}
                                {/* Linked task nodes (from connections) */}
                                {linkedTasks.map((lt) => (
                                    <div
                                        key={lt.nodeId}
                                        className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-all ${lt.completed ? 'opacity-50' : ''}`}
                                    >
                                        <button
                                            onClick={() => toggleLinkedTask(lt.nodeId)}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${lt.completed
                                                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                                                : 'border-zinc-600 hover:border-zinc-400'
                                                }`}
                                        >
                                            {lt.completed && (
                                                <span className="text-[10px]">✓</span>
                                            )}
                                        </button>
                                        <span
                                            className={`flex-1 text-xs leading-snug ${lt.completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}
                                        >
                                            {lt.title}
                                        </span>
                                        <span className="flex-shrink-0 rounded bg-violet-500/10 px-1 py-0.5 text-[9px] text-violet-400">
                                            linked
                                        </span>
                                    </div>
                                ))}
                                {/* Inline tasks (manually added) */}
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-all ${task.completed ? 'opacity-50' : ''
                                            } ${task.rolledOver ? 'border-l-2 border-amber-500/40 pl-2' : ''}`}
                                    >
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${task.completed
                                                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                                                : 'border-zinc-600 hover:border-zinc-400'
                                                }`}
                                        >
                                            {task.completed && (
                                                <span className="text-[10px]">✓</span>
                                            )}
                                        </button>
                                        {isEditing ? (
                                            <input
                                                className={`flex-1 bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600 ${task.completed ? 'line-through text-zinc-500' : ''
                                                    }`}
                                                value={task.title}
                                                placeholder="Task..."
                                                onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    e.stopPropagation()
                                                    if (e.key === 'Enter') {
                                                        addTask()
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className={`flex-1 text-xs leading-snug ${task.completed
                                                    ? 'line-through text-zinc-600'
                                                    : task.title
                                                        ? 'text-zinc-300'
                                                        : 'text-zinc-600 italic'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    this.editor.setEditingShape(shape.id)
                                                }}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            >
                                                {task.title || 'Untitled task'}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="flex-shrink-0 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                                        >
                                            <span className="text-[10px]">✕</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* MIDDLE: Daily Wins (35%) */}
                        <div className="flex flex-col border-r border-white/[0.06]" style={{ width: '35%' }}>
                            <div className="px-4 py-2 border-b border-white/[0.04]">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                                    Daily Wins
                                </span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center px-4 py-3 space-y-3">
                                {dailyWins.map((win) => (
                                    <button
                                        key={win.id}
                                        onClick={() => toggleWin(win.id)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${win.completed
                                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                                            : 'bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 hover:border-zinc-600/40'
                                            }`}
                                    >
                                        <span className="text-lg">{win.emoji}</span>
                                        <span
                                            className={`flex-1 text-left text-sm font-medium ${win.completed ? 'text-emerald-400' : 'text-zinc-400'
                                                }`}
                                        >
                                            {win.label}
                                        </span>
                                        <div
                                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${win.completed
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-zinc-600'
                                                }`}
                                        >
                                            {win.completed && <span className="text-[10px] font-bold">✓</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Quick View (30%) */}
                        <div className="flex flex-col" style={{ width: '30%' }}>
                            <div className="px-4 py-2 border-b border-white/[0.04]">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                                    Overview
                                </span>
                            </div>
                            <div className="flex-1 flex flex-col px-4 py-3 space-y-4">
                                {/* Task Progress */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-zinc-500">Task Progress</span>
                                        <span className="text-zinc-400 font-medium">
                                            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                                            style={{
                                                width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Wins Progress */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-zinc-500">Daily Wins</span>
                                        <span className="text-zinc-400 font-medium">{completedWins}/4</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {dailyWins.map((win) => (
                                            <div
                                                key={win.id}
                                                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${win.completed
                                                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                                    : 'bg-zinc-800'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Rolled Over Tasks */}
                                {tasks.some((t) => t.rolledOver) && (
                                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
                                        <span className="text-[10px] font-medium text-amber-500/70">
                                            ⚠ {tasks.filter((t) => t.rolledOver).length} rolled over
                                        </span>
                                    </div>
                                )}

                                {/* Quick Stats */}
                                <div className="mt-auto space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-zinc-600">Streak</span>
                                        <span className="text-zinc-400">
                                            {completedWins === 4 ? '🔥' : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </HTMLContainer>
        )
    }

    indicator(shape: DailyPlannerNodeShape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
    }

    override canEdit() {
        return true
    }

    override canResize() {
        return true
    }

    override isAspectRatioLocked() {
        return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override onResize(shape: DailyPlannerNodeShape, info: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resizeBox(shape as any, info)
    }

    override onDoubleClick(shape: DailyPlannerNodeShape) {
        this.editor.setEditingShape(shape.id)
    }
}
