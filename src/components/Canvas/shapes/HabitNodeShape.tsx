'use client'

import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
} from 'tldraw'

const habitNodeShapeProps = {
  w: T.number,
  h: T.number,
  name: T.string,
  color: T.string,
  checkIns: T.arrayOf(
    T.object({
      date: T.string,
      completed: T.boolean,
    })
  ),
}

type HabitNodeShapeProps = RecordPropsType<typeof habitNodeShapeProps>

export type HabitNodeShape = TLBaseShape<'habit-node', HabitNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HabitNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'habit-node' as const
  static override props = habitNodeShapeProps

  getDefaultProps(): HabitNodeShapeProps {
    return {
      w: 300,
      h: 160,
      name: 'New Habit',
      color: 'green',
      checkIns: [],
    }
  }

  getGeometry(shape: HabitNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: HabitNodeShape) {
    const { name, color, checkIns } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; accent: string; check: string }> = {
      green: { bg: 'bg-green-950/80', accent: 'bg-green-500', check: 'bg-green-500' },
      blue: { bg: 'bg-blue-950/80', accent: 'bg-blue-500', check: 'bg-blue-500' },
      purple: { bg: 'bg-purple-950/80', accent: 'bg-purple-500', check: 'bg-purple-500' },
      orange: { bg: 'bg-orange-950/80', accent: 'bg-orange-500', check: 'bg-orange-500' },
      red: { bg: 'bg-red-950/80', accent: 'bg-red-500', check: 'bg-red-500' },
      yellow: { bg: 'bg-yellow-950/80', accent: 'bg-yellow-500', check: 'bg-yellow-500' },
    }

    const colors = colorMap[color] || colorMap.green

    // Get last 7 days
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Calculate streaks
    const sortedCheckIns = [...checkIns]
      .filter((c) => c.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const todayStr = today.toISOString().split('T')[0]

    // Calculate current streak
    const checkDate = new Date(today)
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasCheckIn = checkIns.some((c) => c.date === dateStr && c.completed)
      if (hasCheckIn) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr === todayStr) {
        // Today not checked yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Calculate longest streak
    const allDates = checkIns
      .filter((c) => c.completed)
      .map((c) => c.date)
      .sort()

    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(allDates[i - 1])
        const curr = new Date(allDates[i])
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    // Completion rate (last 30 days)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentCheckIns = checkIns.filter((c) => {
      const d = new Date(c.date)
      return d >= thirtyDaysAgo && c.completed
    })
    const completionRate = Math.round((recentCheckIns.length / 30) * 100)

    const toggleDay = (date: string) => {
      const existing = checkIns.find((c) => c.date === date)
      let newCheckIns
      if (existing) {
        newCheckIns = checkIns.map((c) =>
          c.date === date ? { ...c, completed: !c.completed } : c
        )
      } else {
        newCheckIns = [...checkIns, { date, completed: true }]
      }
      this.editor.updateShape({
        id: shape.id,
        type: 'habit-node',
        props: { checkIns: newCheckIns },
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
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} p-4 backdrop-blur-sm transition-all ${
            isSelected ? 'border-green-500 ring-2 ring-green-500/30' : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            {isEditing ? (
              <input
                className="flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder:text-zinc-500"
                value={name}
                placeholder="Habit name..."
                autoFocus
                onChange={(e) => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'habit-node',
                    props: { name: e.target.value },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    this.editor.setEditingShape(null)
                  }
                }}
                onBlur={() => this.editor.setEditingShape(null)}
              />
            ) : (
              <h3
                className="cursor-text text-lg font-semibold text-white hover:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation()
                  this.editor.setEditingShape(shape.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {name || 'Click to name habit...'}
              </h3>
            )}
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                🔥 {currentStreak}
              </div>
            )}
          </div>

          {/* 7-Day Grid */}
          <div className="mb-3 grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              const dayDate = new Date(date)
              const isChecked = checkIns.some((c) => c.date === date && c.completed)
              const isToday = date === todayStr

              return (
                <button
                  key={date}
                  onClick={() => toggleDay(date)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`flex flex-col items-center rounded-lg p-1.5 transition-all ${
                    isToday ? 'ring-2 ring-white/30' : ''
                  } ${isChecked ? colors.check + ' text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  <span className="text-[10px] font-medium">
                    {dayNames[dayDate.getDay()]}
                  </span>
                  <span className="text-xs">{dayDate.getDate()}</span>
                  {isChecked && <span className="text-sm">✓</span>}
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex gap-3">
              <span>
                Rate: <span className="text-white">{completionRate}%</span>
              </span>
              <span>
                Best: <span className="text-white">{longestStreak}d</span>
              </span>
            </div>
            <span className="text-zinc-500">Last 30 days</span>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: HabitNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
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
  override onResize(shape: HabitNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: HabitNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
