'use client'

import { useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Check, Target, Calendar, TrendingUp, BarChart3, RotateCcw } from 'lucide-react'
import type { GoalNodeShape } from './shapes/GoalNodeShape'
import { ProgressChart } from './ProgressChart'

const colors = [
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'orange', hex: '#f97316' },
  { name: 'red', hex: '#ef4444' },
  { name: 'yellow', hex: '#eab308' },
]

interface Milestone {
  id: string
  title: string
  completed: boolean
}

interface CheckIn {
  id: string
  date: string
  progress: number
  notes: string
}

export function GoalPropertiesPanel() {
  const editor = useEditor()
  const [newMilestone, setNewMilestone] = useState('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInProgress, setCheckInProgress] = useState(0)
  const [checkInNotes, setCheckInNotes] = useState('')

  const selectedShape = useValue(
    'selected goal node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null

      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'goal-node') return null

      return shape as unknown as GoalNodeShape
    },
    [editor]
  )

  if (!selectedShape) return null

  const { progress, color, targetDate, milestones = [], status, quarter = '', rolledOverFrom = '' } = selectedShape.props

  // Generate quarter options
  const generateQuarterOptions = () => {
    const options: string[] = []
    const now = new Date()
    const currentYear = now.getFullYear()

    // Previous year Q3, Q4 + current year all quarters + next year Q1, Q2
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      for (let q = 1; q <= 4; q++) {
        if (y === currentYear - 1 && q < 3) continue
        if (y === currentYear + 1 && q > 2) continue
        options.push(`Q${q} ${y}`)
      }
    }
    return options
  }

  const quarterOptions = generateQuarterOptions()

  // Get next quarter
  const getNextQuarter = (currentQ: string): string => {
    const match = currentQ.match(/Q(\d) (\d{4})/)
    if (!match) return currentQ
    let q = parseInt(match[1])
    let y = parseInt(match[2])
    q++
    if (q > 4) {
      q = 1
      y++
    }
    return `Q${q} ${y}`
  }

  const updateGoal = (updates: Partial<GoalNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'goal-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const handleColorChange = (colorName: string) => {
    updateGoal({ color: colorName })
  }

  const handleProgressChange = (value: number) => {
    updateGoal({ progress: Math.min(100, Math.max(0, value)) })
  }

  const handleDateChange = (date: string) => {
    updateGoal({ targetDate: date })
  }

  const handleStatusChange = (newStatus: string) => {
    updateGoal({ status: newStatus })
  }

  const handleQuarterChange = (newQuarter: string) => {
    updateGoal({ quarter: newQuarter })
  }

  const handleRollover = () => {
    if (!quarter) return
    const nextQ = getNextQuarter(quarter)
    updateGoal({
      quarter: nextQ,
      rolledOverFrom: quarter,
      // Reset progress for new quarter but keep milestones
      progress: 0,
      checkIns: [],
      status: 'active',
    })
  }

  const addMilestone = () => {
    if (!newMilestone.trim()) return
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      title: newMilestone.trim(),
      completed: false,
    }
    updateGoal({ milestones: [...milestones, milestone] })
    setNewMilestone('')
  }

  const toggleMilestone = (id: string) => {
    const updated = milestones.map((m: Milestone) =>
      m.id === id ? { ...m, completed: !m.completed } : m
    )
    updateGoal({ milestones: updated })
  }

  const deleteMilestone = (id: string) => {
    updateGoal({ milestones: milestones.filter((m: Milestone) => m.id !== id) })
  }

  const addCheckIn = () => {
    const checkIn: CheckIn = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      progress: checkInProgress,
      notes: checkInNotes,
    }
    const currentCheckIns = selectedShape.props.checkIns || []
    updateGoal({
      checkIns: [...currentCheckIns, checkIn],
      progress: checkInProgress,
    })
    setShowCheckIn(false)
    setCheckInProgress(progress)
    setCheckInNotes('')
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-700 p-3">
        <Target className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Goal Settings</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-3">
        {/* Color Selection */}
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
                onClick={() => handleColorChange(c.name)}
              />
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Status
          </label>
          <div className="flex gap-2">
            {['active', 'completed', 'archived'].map((s) => (
              <button
                key={s}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  status === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quarter */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Quarter
          </label>
          <div className="flex gap-2">
            <select
              value={quarter}
              onChange={(e) => handleQuarterChange(e.target.value)}
              className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 text-sm text-white"
            >
              {quarterOptions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            {status === 'active' && progress < 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 border border-yellow-500/30 bg-yellow-500/10 px-2 text-xs text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300"
                onClick={handleRollover}
                title="Roll over to next quarter"
              >
                <RotateCcw className="h-3 w-3" />
                Rollover
              </Button>
            )}
          </div>
          {rolledOverFrom && (
            <p className="mt-1.5 text-xs text-yellow-400/70">
              Rolled over from {rolledOverFrom}
            </p>
          )}
        </div>

        {/* Target Date */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Calendar className="h-3 w-3" />
            Target Date
          </label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-8 border-zinc-700 bg-zinc-800 text-sm text-white"
          />
        </div>

        {/* Progress Slider */}
        <div className="mb-4">
          <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Progress
            </span>
            <span className="text-white">{progress}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => handleProgressChange(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-blue-500"
          />
        </div>

        {/* Weekly Check-in */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Weekly Check-in
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
              onClick={() => {
                setCheckInProgress(progress)
                setShowCheckIn(!showCheckIn)
              }}
            >
              {showCheckIn ? 'Cancel' : 'Log Progress'}
            </Button>
          </div>
          {showCheckIn && (
            <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3">
              <div className="mb-3">
                <label className="mb-1 block text-xs text-zinc-400">New Progress</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={checkInProgress}
                  onChange={(e) => setCheckInProgress(parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-blue-500"
                />
                <div className="mt-1 text-right text-xs text-zinc-400">{checkInProgress}%</div>
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs text-zinc-400">Notes</label>
                <textarea
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="What did you accomplish?"
                  className="h-16 w-full resize-none rounded border border-zinc-600 bg-zinc-700 p-2 text-xs text-white placeholder:text-zinc-500"
                />
              </div>
              <Button
                size="sm"
                className="h-7 w-full text-xs"
                onClick={addCheckIn}
              >
                Save Check-in
              </Button>
            </div>
          )}
        </div>

        {/* Progress Chart */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <BarChart3 className="h-3 w-3" />
            Progress History
          </label>
          <ProgressChart
            checkIns={selectedShape.props.checkIns || []}
            currentProgress={progress}
            color={color}
          />
        </div>

        {/* Milestones */}
        <div className="mb-2">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Milestones
          </label>
          <div className="space-y-2">
            {milestones.map((m: Milestone) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 p-2"
              >
                <button
                  onClick={() => toggleMilestone(m.id)}
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    m.completed
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-zinc-600 text-transparent hover:border-zinc-500'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </button>
                <span
                  className={`flex-1 text-sm ${
                    m.completed ? 'text-zinc-500 line-through' : 'text-white'
                  }`}
                >
                  {m.title}
                </span>
                <button
                  onClick={() => deleteMilestone(m.id)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="Add milestone..."
              className="h-8 flex-1 border-zinc-700 bg-zinc-800 text-sm text-white"
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={addMilestone}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
