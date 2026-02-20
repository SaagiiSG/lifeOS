'use client'

import { useEditor, useValue } from 'tldraw'
import { Input } from '@/components/ui/input'
import { Target, Calendar } from 'lucide-react'
import type { GoalEcosystemNodeShape } from './shapes/GoalEcosystemNodeShape'

const colors = [
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'orange', hex: '#f97316' },
  { name: 'red', hex: '#ef4444' },
  { name: 'yellow', hex: '#eab308' },
]

export function GoalEcosystemPropertiesPanel() {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected goal ecosystem node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'goal-ecosystem-node') return null
      return shape as unknown as GoalEcosystemNodeShape
    },
    [editor]
  )

  // Calculate stats for the progress overview
  const stats = useValue(
    'ecosystem stats',
    () => {
      if (!selectedShape) return null
      const bounds = editor.getShapePageBounds(selectedShape.id)
      if (!bounds) return null

      const allShapes = editor.getCurrentPageShapes()

      const tasks = allShapes.filter(s => {
        if ((s as any).type !== 'task-node') return false
        const sBounds = editor.getShapePageBounds(s.id)
        return sBounds && bounds.contains(sBounds)
      })

      const phases = allShapes.filter(s => {
        if ((s as any).type !== 'phase-node') return false
        const sBounds = editor.getShapePageBounds(s.id)
        return sBounds && bounds.contains(sBounds)
      })

      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => (t as any).props.completed).length

      let completedPhases = 0
      for (const phase of phases) {
        const pBounds = editor.getShapePageBounds(phase.id)
        if (!pBounds) continue
        const phaseTasks = tasks.filter(t => {
          const tB = editor.getShapePageBounds(t.id)
          return tB && pBounds.contains(tB)
        })
        if (phaseTasks.length > 0 && phaseTasks.every(t => (t as any).props.completed)) {
          completedPhases++
        }
      }

      return { totalTasks, completedTasks, totalPhases: phases.length, completedPhases }
    },
    [editor, selectedShape?.id]
  )

  if (!selectedShape) return null

  const { color, status, quarter, year, description } = selectedShape.props

  const updateEcosystem = (updates: Partial<GoalEcosystemNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'goal-ecosystem-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  // Generate quarter options
  const quarterOptions = ['Q1', 'Q2', 'Q3', 'Q4']
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 border-b border-zinc-700 p-3">
        <Target className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Goal Ecosystem</span>
      </div>

      <div className="p-3">
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
                onClick={() => updateEcosystem({ color: c.name })}
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
                onClick={() => updateEcosystem({ status: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quarter + Year */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Calendar className="h-3 w-3" />
            Quarter
          </label>
          <div className="flex gap-2">
            <select
              value={quarter}
              onChange={(e) => updateEcosystem({ quarter: e.target.value })}
              className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 text-sm text-white"
            >
              {quarterOptions.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => updateEcosystem({ year: parseInt(e.target.value) })}
              className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 text-sm text-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => updateEcosystem({ description: e.target.value })}
            placeholder="Describe your goal..."
            className="h-20 w-full resize-none rounded border border-zinc-700 bg-zinc-800 p-2 text-xs text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Progress Overview */}
        {stats && (
          <div className="mb-2">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              Progress
            </label>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Overall</span>
                <span className="font-medium text-white">
                  {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                </span>
              </div>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: stats.totalTasks > 0 ? `${(stats.completedTasks / stats.totalTasks) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Phases: {stats.completedPhases}/{stats.totalPhases}</span>
                <span>Tasks: {stats.completedTasks}/{stats.totalTasks}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
