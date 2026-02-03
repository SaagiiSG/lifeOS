'use client'

import { useMemo } from 'react'
import { useEditor, useValue } from 'tldraw'
import { Flame, Calendar, TrendingUp } from 'lucide-react'
import type { HabitNodeShape } from './shapes/HabitNodeShape'

const colors = [
  { name: 'green', hex: '#22c55e' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'orange', hex: '#f97316' },
  { name: 'red', hex: '#ef4444' },
  { name: 'yellow', hex: '#eab308' },
]

export function HabitPropertiesPanel() {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected habit node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'habit-node') return null
      return shape as unknown as HabitNodeShape
    },
    [editor]
  )

  const stats = useMemo(() => {
    if (!selectedShape) return null

    const checkIns = selectedShape.props.checkIns || []
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Current streak
    let currentStreak = 0
    const checkDate = new Date(today)
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasCheckIn = checkIns.some((c) => c.date === dateStr && c.completed)
      if (hasCheckIn) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr === todayStr) {
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Longest streak
    let longestStreak = 0
    let tempStreak = 0
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
        tempStreak = diff === 1 ? tempStreak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    // Completion rates
    const last7Days = checkIns.filter((c) => {
      const d = new Date(c.date)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return d >= weekAgo && c.completed
    }).length

    const last30Days = checkIns.filter((c) => {
      const d = new Date(c.date)
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return d >= monthAgo && c.completed
    }).length

    // Monthly heatmap data (last 4 weeks)
    const heatmapData: { date: string; completed: boolean }[] = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const completed = checkIns.some((c) => c.date === dateStr && c.completed)
      heatmapData.push({ date: dateStr, completed })
    }

    return {
      currentStreak,
      longestStreak,
      weeklyRate: Math.round((last7Days / 7) * 100),
      monthlyRate: Math.round((last30Days / 30) * 100),
      totalCompleted: checkIns.filter((c) => c.completed).length,
      heatmapData,
    }
  }, [selectedShape])

  if (!selectedShape || !stats) return null

  const { color } = selectedShape.props

  const updateHabit = (updates: Partial<HabitNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'habit-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-zinc-700 p-3">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-medium text-white">Habit Tracker</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-3">
        {/* Color */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Color
          </label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c.name ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => updateHabit({ color: c.name })}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-zinc-800 p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">🔥 {stats.currentStreak}</div>
            <div className="text-xs text-zinc-500">Current Streak</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.longestStreak}</div>
            <div className="text-xs text-zinc-500">Best Streak</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.weeklyRate}%</div>
            <div className="text-xs text-zinc-500">This Week</div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.monthlyRate}%</div>
            <div className="text-xs text-zinc-500">This Month</div>
          </div>
        </div>

        {/* Monthly Heatmap */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Calendar className="h-3 w-3" />
            Last 4 Weeks
          </label>
          <div className="grid grid-cols-7 gap-1">
            {stats.heatmapData.map((day, i) => (
              <div
                key={i}
                className={`h-6 w-full rounded ${
                  day.completed ? 'bg-green-500' : 'bg-zinc-800'
                }`}
                title={day.date}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>4 weeks ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <TrendingUp className="h-4 w-4" />
            Total Completions
          </div>
          <div className="text-lg font-bold text-white">{stats.totalCompleted}</div>
        </div>
      </div>
    </div>
  )
}
