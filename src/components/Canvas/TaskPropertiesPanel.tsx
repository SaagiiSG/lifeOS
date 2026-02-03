'use client'

import { useEditor, useValue } from 'tldraw'
import { Input } from '@/components/ui/input'
import { CheckSquare, Calendar, Flag } from 'lucide-react'
import type { TaskNodeShape } from './shapes/TaskNodeShape'

const colors = [
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'orange', hex: '#f97316' },
  { name: 'red', hex: '#ef4444' },
  { name: 'yellow', hex: '#eab308' },
]

const priorities = [
  { name: 'low', label: 'Low', color: 'bg-zinc-600' },
  { name: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { name: 'high', label: 'High', color: 'bg-red-500' },
]

export function TaskPropertiesPanel() {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected task node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'task-node') return null
      return shape as unknown as TaskNodeShape
    },
    [editor]
  )

  if (!selectedShape) return null

  const { color, priority, dueDate, completed } = selectedShape.props

  const updateTask = (updates: Partial<TaskNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'task-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-zinc-700 p-3">
        <CheckSquare className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-white">Task Settings</span>
      </div>

      <div className="p-3">
        {/* Status */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Status
          </label>
          <button
            onClick={() => updateTask({ completed: !completed })}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              completed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {completed ? '✓ Completed' : 'Mark Complete'}
          </button>
        </div>

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
                onClick={() => updateTask({ color: c.name })}
              />
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Flag className="h-3 w-3" />
            Priority
          </label>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.name}
                onClick={() => updateTask({ priority: p.name })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  priority === p.name
                    ? `${p.color} text-white`
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="mb-2">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Calendar className="h-3 w-3" />
            Due Date
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => updateTask({ dueDate: e.target.value })}
            className="h-9 border-zinc-700 bg-zinc-800 text-sm text-white"
          />
          {dueDate && (
            <button
              onClick={() => updateTask({ dueDate: '' })}
              className="mt-1 text-xs text-zinc-500 hover:text-zinc-400"
            >
              Clear date
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
