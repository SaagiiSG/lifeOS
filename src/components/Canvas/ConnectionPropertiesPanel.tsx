'use client'

import { useEditor, useValue } from 'tldraw'
import { Input } from '@/components/ui/input'
import { ArrowRight, Trash2 } from 'lucide-react'
import type { ConnectionShape } from './shapes/ConnectionShape'

const colors = [
  { name: 'zinc', hex: '#71717a' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'orange', hex: '#f97316' },
  { name: 'red', hex: '#ef4444' },
  { name: 'yellow', hex: '#eab308' },
]

const styles = [
  { name: 'solid', label: 'Solid' },
  { name: 'dashed', label: 'Dashed' },
  { name: 'dotted', label: 'Dotted' },
]

const anchors = [
  { name: 'top', label: 'Top' },
  { name: 'right', label: 'Right' },
  { name: 'bottom', label: 'Bottom' },
  { name: 'left', label: 'Left' },
  { name: 'center', label: 'Center' },
]

export function ConnectionPropertiesPanel() {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected connection',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null
      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'connection') return null
      return shape as unknown as ConnectionShape
    },
    [editor]
  )

  if (!selectedShape) return null

  const { color, style, label, fromAnchor, toAnchor } = selectedShape.props

  const updateConnection = (updates: Partial<ConnectionShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'connection',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const handleDelete = () => {
    editor.deleteShapes([selectedShape.id])
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-700 p-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Connection</span>
        </div>
        <button
          onClick={handleDelete}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        {/* Label */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Label
          </label>
          <Input
            value={label}
            onChange={(e) => updateConnection({ label: e.target.value })}
            placeholder="Optional label..."
            className="h-8 border-zinc-700 bg-zinc-800 text-sm text-white"
          />
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
                onClick={() => updateConnection({ color: c.name })}
              />
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Style
          </label>
          <div className="flex gap-2">
            {styles.map((s) => (
              <button
                key={s.name}
                onClick={() => updateConnection({ style: s.name })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  style === s.name
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anchors */}
        <div className="mb-2 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              From Anchor
            </label>
            <select
              value={fromAnchor}
              onChange={(e) => updateConnection({ fromAnchor: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
            >
              {anchors.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              To Anchor
            </label>
            <select
              value={toAnchor}
              onChange={(e) => updateConnection({ toAnchor: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white"
            >
              {anchors.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
