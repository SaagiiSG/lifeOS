'use client'

import { useEditor, track } from 'tldraw'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, Flame, CheckSquare } from 'lucide-react'

interface QuickLogPanelProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}

export const QuickLogPanel = track(function QuickLogPanel({ isOpen, onClose, onOpen }: QuickLogPanelProps) {
  const editor = useEditor()

  const allShapes = editor.getCurrentPageShapes()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashboardShapes = allShapes.filter(s => (s.type as string) === 'habit-dashboard-node') as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskShapes = allShapes.filter(s => (s.type as string) === 'task-node') as any[]

  // Collect all habits from all dashboards
  const allHabits: Array<{ dashboardId: string; habit: { id: string; name: string; color: string; checkIns: Array<{ date: string; completed: boolean }> } }> = []
  for (const dashboard of dashboardShapes) {
    const habits = dashboard.props.habits || []
    for (const habit of habits) {
      allHabits.push({ dashboardId: dashboard.id, habit })
    }
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const displayDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const toggleHabitCheckIn = (dashboardId: string, habitId: string) => {
    const dashboard = dashboardShapes.find((d: { id: string }) => d.id === dashboardId)
    if (!dashboard) return
    const habits = dashboard.props.habits || []
    const newHabits = habits.map((h: { id: string; checkIns: Array<{ date: string; completed: boolean }> }) => {
      if (h.id !== habitId) return h
      const checkIns = h.checkIns || []
      const existing = checkIns.find((c: { date: string }) => c.date === todayStr)
      let newCheckIns: Array<{ date: string; completed: boolean }>
      if (existing) {
        newCheckIns = checkIns.map((c: { date: string; completed: boolean }) =>
          c.date === todayStr ? { ...c, completed: !c.completed } : c
        )
      } else {
        newCheckIns = [...checkIns, { date: todayStr, completed: true }]
      }
      return { ...h, checkIns: newCheckIns }
    })
    editor.updateShape({
      id: dashboardId,
      type: 'habit-dashboard-node',
      props: { habits: newHabits },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const toggleTaskCompletion = (shapeId: string, currentCompleted: boolean) => {
    editor.updateShape({
      id: shapeId,
      type: 'task-node',
      props: { completed: !currentCompleted },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const isHabitCheckedToday = (checkIns: Array<{ date: string; completed: boolean }>) => {
    const entry = checkIns.find(c => c.date === todayStr)
    return entry?.completed ?? false
  }

  const completedHabits = allHabits.filter(h => isHabitCheckedToday(h.habit.checkIns)).length
  const completedTasks = taskShapes.filter(t => t.props.completed).length

  return (
    <>
      {/* Slide-out panel */}
      <div
        className="absolute left-0 top-0 z-[60] h-full transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          width: 320,
        }}
      >
        <div
          className="flex h-full w-full flex-col border-r border-white/[0.06]"
          style={{
            background: 'rgba(10, 10, 12, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Quick Log</h2>
              <p className="mt-0.5 text-xs text-zinc-500">{displayDate}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-3">
            <div className="flex items-center gap-1.5 text-xs">
              <Flame className="h-3 w-3 text-orange-400/70" />
              <span className="text-zinc-400">{completedHabits}/{allHabits.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckSquare className="h-3 w-3 text-blue-400/70" />
              <span className="text-zinc-400">{completedTasks}/{taskShapes.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3">
              {/* Habits Section */}
              {allHabits.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    Habits
                  </h3>
                  <div className="space-y-1">
                    {allHabits.map(({ dashboardId, habit }) => {
                      const checked = isHabitCheckedToday(habit.checkIns)
                      const colorMap: Record<string, string> = {
                        green: 'border-green-500/60 bg-green-500/20',
                        blue: 'border-blue-500/60 bg-blue-500/20',
                        purple: 'border-purple-500/60 bg-purple-500/20',
                        orange: 'border-orange-500/60 bg-orange-500/20',
                        red: 'border-red-500/60 bg-red-500/20',
                        yellow: 'border-yellow-500/60 bg-yellow-500/20',
                      }
                      const checkedStyle = colorMap[habit.color] || colorMap.green

                      return (
                        <button
                          key={habit.id}
                          onClick={() => toggleHabitCheckIn(dashboardId, habit.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                            checked
                              ? 'bg-white/[0.03] border border-white/[0.06]'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                              checked
                                ? checkedStyle + ' text-white'
                                : 'border-zinc-600'
                            }`}
                          >
                            {checked && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                          <span
                            className={`flex-1 text-left text-sm ${
                              checked ? 'text-zinc-300' : 'text-zinc-400'
                            }`}
                          >
                            {habit.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {taskShapes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    Tasks
                  </h3>
                  <div className="space-y-1">
                    {taskShapes.map(task => {
                      const completed = task.props.completed

                      return (
                        <button
                          key={task.id}
                          onClick={() => toggleTaskCompletion(task.id, completed)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                            completed
                              ? 'opacity-50'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                              completed
                                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                                : 'border-zinc-600'
                            }`}
                          >
                            {completed && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                          <span
                            className={`flex-1 text-left text-sm ${
                              completed ? 'line-through text-zinc-600' : 'text-zinc-400'
                            }`}
                          >
                            {task.props.title || 'Untitled'}
                          </span>
                          {task.props.priority === 'high' && (
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
                              HIGH
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {allHabits.length === 0 && taskShapes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-zinc-500">No habits or tasks yet</p>
                  <p className="mt-1 text-xs text-zinc-600">Create some from the toolbar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle tab (always visible on left edge when panel is closed) */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="absolute left-0 top-1/2 z-[59] -translate-y-1/2 rounded-r-lg border border-l-0 border-white/[0.06] px-1 py-4 transition-all hover:bg-white/5"
          style={{
            background: 'rgba(10, 10, 12, 0.7)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        </button>
      )}
    </>
  )
})
