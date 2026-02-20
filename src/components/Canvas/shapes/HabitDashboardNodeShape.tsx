'use client'

import { useState } from 'react'
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
} from 'tldraw'

const habitDashboardNodeShapeProps = {
  w: T.number,
  h: T.number,
  habits: T.arrayOf(
    T.object({
      id: T.string,
      name: T.string,
      color: T.string,
      checkIns: T.arrayOf(
        T.object({
          date: T.string,
          completed: T.boolean,
        })
      ),
    })
  ),
}

type HabitDashboardNodeShapeProps = RecordPropsType<typeof habitDashboardNodeShapeProps>

export type HabitDashboardNodeShape = TLBaseShape<'habit-dashboard-node', HabitDashboardNodeShapeProps>

const COLORS = ['green', 'blue', 'purple', 'orange', 'red', 'yellow'] as const

const COLOR_MAP: Record<string, { bg: string; text: string; fill: string; dot: string }> = {
  green: { bg: 'bg-green-500/10', text: 'text-green-400', fill: 'bg-green-500', dot: '#22c55e' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', fill: 'bg-blue-500', dot: '#3b82f6' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', fill: 'bg-purple-500', dot: '#a855f7' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', fill: 'bg-orange-500', dot: '#f97316' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', fill: 'bg-red-500', dot: '#ef4444' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', fill: 'bg-yellow-500', dot: '#eab308' },
}

let nextHabitId = 1

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HabitDashboardNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'habit-dashboard-node' as const
  static override props = habitDashboardNodeShapeProps

  getDefaultProps(): HabitDashboardNodeShapeProps {
    return {
      w: 560,
      h: 380,
      habits: [],
    }
  }

  getGeometry(shape: HabitDashboardNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: HabitDashboardNodeShape) {
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const habits = shape.props.habits || []
    const [dateOffset, setDateOffset] = useState(0)

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const today = new Date()
    const selectedDate = new Date(today)
    selectedDate.setDate(selectedDate.getDate() + dateOffset)
    const selectedDateStr = formatLocalDate(selectedDate)
    const isToday = dateOffset === 0

    const formatDisplayDate = (d: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = d.getDate()
      const suffix = day === 1 || day === 21 || day === 31 ? 'st'
        : day === 2 || day === 22 ? 'nd'
        : day === 3 || day === 23 ? 'rd'
        : 'th'
      return `${months[d.getMonth()]} ${day}${suffix}`
    }

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (29 - i))
      return formatLocalDate(d)
    })

    const last7Days = last30Days.slice(-7)

    const habitStats = habits.map(habit => {
      const checkIns = habit.checkIns || []
      const checkInMap = new Map(checkIns.map(c => [c.date, c.completed]))

      let streak = 0
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = formatLocalDate(d)
        if (checkInMap.get(dateStr)) {
          streak++
        } else {
          break
        }
      }

      const completedIn30 = last30Days.filter(d => checkInMap.get(d)).length
      const rate = Math.round((completedIn30 / 30) * 100)
      const week = last7Days.map(d => checkInMap.get(d) ?? false)
      const heatmap = last30Days.map(d => checkInMap.get(d) ?? false)
      const checkedOnDate = checkInMap.get(selectedDateStr) ?? false

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        streak,
        rate,
        week,
        heatmap,
        checkedOnDate,
      }
    })

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const weekDayLabels = last7Days.map(d => {
      const date = new Date(d + 'T00:00:00')
      return dayLabels[date.getDay() === 0 ? 6 : date.getDay() - 1]
    })

    // Add new habit internally
    const handleAddHabit = () => {
      const newHabit = {
        id: `habit-${Date.now()}-${nextHabitId++}`,
        name: 'New Habit',
        color: COLORS[habits.length % COLORS.length],
        checkIns: [] as Array<{ date: string; completed: boolean }>,
      }
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-dashboard-node',
        props: { habits: [...habits, newHabit] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    // Toggle selected date's check-in for a habit
    const toggleDateCheckIn = (habitId: string) => {
      const newHabits = habits.map(h => {
        if (h.id !== habitId) return h
        const checkIns = h.checkIns || []
        const existing = checkIns.find(c => c.date === selectedDateStr)
        let newCheckIns: Array<{ date: string; completed: boolean }>
        if (existing) {
          newCheckIns = checkIns.map(c =>
            c.date === selectedDateStr ? { ...c, completed: !c.completed } : c
          )
        } else {
          newCheckIns = [...checkIns, { date: selectedDateStr, completed: true }]
        }
        return { ...h, checkIns: newCheckIns }
      })
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-dashboard-node',
        props: { habits: newHabits },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    // Change habit color
    const changeHabitColor = (habitId: string, newColor: string) => {
      const newHabits = habits.map(h =>
        h.id === habitId ? { ...h, color: newColor } : h
      )
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-dashboard-node',
        props: { habits: newHabits },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    // Rename habit
    const renameHabit = (habitId: string, newName: string) => {
      const newHabits = habits.map(h =>
        h.id === habitId ? { ...h, name: newName } : h
      )
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-dashboard-node',
        props: { habits: newHabits },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    // Delete habit
    const deleteHabit = (habitId: string) => {
      const newHabits = habits.filter(h => h.id !== habitId)
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-dashboard-node',
        props: { habits: newHabits },
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
          className={`flex h-full w-full flex-col rounded-2xl border transition-all ${
            isSelected
              ? 'border-violet-500/60 ring-2 ring-violet-500/20 ring-offset-0'
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
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Habit Dashboard
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setDateOffset(prev => prev - 1)
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setDateOffset(0)
                  }}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    isToday ? 'text-violet-400' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {isToday ? 'Today' : formatDisplayDate(selectedDate)}
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    if (dateOffset < 0) setDateOffset(prev => prev + 1)
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                    dateOffset >= 0 ? 'text-zinc-700 cursor-default' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {habits.length} habit{habits.length !== 1 ? 's' : ''}
              </span>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation()
                  handleAddHabit()
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                +
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {habitStats.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-sm text-zinc-600">No habits yet</p>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    handleAddHabit()
                  }}
                  className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 transition-colors hover:bg-violet-500/20"
                >
                  + Create your first habit
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {habitStats.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    weekDayLabels={weekDayLabels}
                    onToggleDate={() => toggleDateCheckIn(habit.id)}
                    onChangeColor={(color) => changeHabitColor(habit.id, color)}
                    onRename={(name) => renameHabit(habit.id, name)}
                    onDelete={() => deleteHabit(habit.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: HabitDashboardNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
  }

  override canResize() {
    return true
  }

  override isAspectRatioLocked() {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override onResize(shape: HabitDashboardNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }
}

// Separate component for each habit row (manages its own context menu and edit state)
function HabitRow({
  habit,
  weekDayLabels,
  onToggleDate,
  onChangeColor,
  onRename,
  onDelete,
}: {
  habit: {
    id: string
    name: string
    color: string
    streak: number
    rate: number
    week: boolean[]
    heatmap: boolean[]
    checkedOnDate: boolean
  }
  weekDayLabels: string[]
  onToggleDate: () => void
  onChangeColor: (color: string) => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)

  const colors = COLOR_MAP[habit.color] || COLOR_MAP.green

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setShowMenu(true)
  }

  const hexColor = colors.dot

  return (
    <div
      className="group relative rounded-xl px-4 py-3 transition-all hover:bg-white/[0.03]"
      style={{
        border: habit.checkedOnDate
          ? `1px solid ${hexColor}33`
          : '1px solid rgba(255,255,255,0.04)',
        borderLeft: habit.checkedOnDate
          ? `3px solid ${hexColor}`
          : '1px solid rgba(255,255,255,0.04)',
        background: habit.checkedOnDate
          ? `${hexColor}08`
          : 'rgba(255,255,255,0.02)',
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Top row: check + name + stats */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Today check-in toggle */}
          <button
            onClick={onToggleDate}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-all"
            style={{
              backgroundColor: habit.checkedOnDate ? hexColor : 'transparent',
              border: habit.checkedOnDate ? 'none' : '2px solid #52525b',
              color: habit.checkedOnDate ? 'white' : 'transparent',
            }}
          >
            {habit.checkedOnDate && <span className="text-[10px] font-bold">✓</span>}
          </button>
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hexColor }} />
          {isEditing ? (
            <input
              className="bg-transparent text-sm font-medium text-zinc-300 outline-none border-b border-zinc-600 w-28"
              defaultValue={habit.name}
              autoFocus
              onBlur={(e) => {
                const val = e.target.value.trim()
                if (val && val !== habit.name) onRename(val)
                setIsEditing(false)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val && val !== habit.name) onRename(val)
                  setIsEditing(false)
                }
                if (e.key === 'Escape') setIsEditing(false)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm font-medium text-zinc-300 cursor-text hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {habit.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {habit.streak > 0 && (
            <span className="text-xs font-medium" style={{ color: hexColor }}>
              {habit.streak}d streak
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {habit.rate}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-zinc-600 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Last 7 days mini-grid */}
      <div className="flex items-center gap-1">
        {habit.week.map((done, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="h-5 w-5 rounded-md"
              style={{
                backgroundColor: done ? hexColor : 'rgba(39, 39, 42, 0.8)',
                border: done ? 'none' : `1px solid ${hexColor}15`,
              }}
            />
            <span className="text-[8px] text-zinc-600">{weekDayLabels[i]}</span>
          </div>
        ))}
        <div className="ml-2 flex flex-wrap gap-[2px]" style={{ maxWidth: 120 }}>
          {habit.heatmap.slice(0, 30).map((done, i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-[2px]"
              style={{
                backgroundColor: done ? `${hexColor}b3` : 'rgba(39, 39, 42, 0.5)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setShowMenu(false)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div
            className="absolute z-[101] w-44 rounded-lg border border-white/[0.08] py-1 shadow-xl"
            style={{
              left: menuPos.x,
              top: menuPos.y,
              background: 'rgba(20, 20, 24, 0.95)',
              backdropFilter: 'blur(12px)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Rename */}
            <button
              onClick={() => {
                setShowMenu(false)
                setIsEditing(true)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5"
            >
              Rename
            </button>
            <div className="mx-2 my-1 h-px bg-white/[0.06]" />
            {/* Color picker */}
            <div className="px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Color
              </span>
              <div className="mt-1.5 flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      onChangeColor(c)
                      setShowMenu(false)
                    }}
                    className={`h-5 w-5 rounded-full transition-all hover:scale-110 ${
                      habit.color === c ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-zinc-900' : ''
                    }`}
                    style={{ backgroundColor: COLOR_MAP[c].dot }}
                  />
                ))}
              </div>
            </div>
            <div className="mx-2 my-1 h-px bg-white/[0.06]" />
            {/* Delete */}
            <button
              onClick={() => {
                onDelete()
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-white/5"
            >
              Delete habit
            </button>
          </div>
        </>
      )}
    </div>
  )
}
