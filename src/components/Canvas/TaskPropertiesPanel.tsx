'use client'

import { useEditor, useValue } from 'tldraw'
import { Input } from '@/components/ui/input'
import { CheckSquare, Calendar, Flag, Lock, Check, Link2 } from 'lucide-react'
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

  const selectedShapeId = selectedShape?.id ?? null

  // Compute dependencies for this task
  const dependencies = useValue(
    'task dependencies',
    () => {
      if (!selectedShapeId) return []
      const allShapes = editor.getCurrentPageShapes()
      const connections = allShapes.filter((s) => (s as any).type === 'connection')
      const deps: { id: string; completed: boolean; title: string }[] = []

      for (const conn of connections) {
        const connProps = (conn as any).props
        if (connProps.toId === selectedShapeId) {
          const sourceShape = editor.getShape(connProps.fromId)
          if (sourceShape && (sourceShape as any).type === 'task-node') {
            deps.push({
              id: sourceShape.id,
              completed: (sourceShape as any).props.completed,
              title: (sourceShape as any).props.title,
            })
          }
        }
      }
      return deps
    },
    [editor, selectedShapeId]
  )

  if (!selectedShape) return null

  const { color, priority, dueDate, completed } = selectedShape.props
  const isLocked = dependencies.some((d) => !d.completed)

  const updateTask = (updates: Partial<TaskNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'task-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <div className="w-full">
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
            onClick={() => !isLocked && updateTask({ completed: !completed })}
            disabled={isLocked}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isLocked
                ? 'cursor-not-allowed bg-zinc-800/50 text-zinc-500'
                : completed
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
          >
            {isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                Blocked
              </>
            ) : completed ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Completed
              </>
            ) : (
              'Mark Complete'
            )}
          </button>
        </div>

        {/* Dependencies */}
        {dependencies.length > 0 && (
          <div className="mb-4">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <Link2 className="h-3 w-3" />
              Dependencies ({dependencies.filter(d => d.completed).length}/{dependencies.length})
            </label>
            <div className="flex flex-col gap-1">
              {dependencies.map((dep) => (
                <button
                  key={dep.id}
                  onClick={() => {
                    editor.select(dep.id as any)
                    editor.zoomToSelection({ animation: { duration: 300 } })
                  }}
                  className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700/50"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${dep.completed
                      ? 'border-green-500 bg-green-500'
                      : 'border-zinc-600'
                    }`}
                  >
                    {dep.completed && (
                      <Check className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  <span className={dep.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                    {dep.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Color
          </label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c.name ? 'border-white' : 'border-transparent'
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
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${priority === p.name
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
