'use client'

import { useEditor, useValue } from 'tldraw'
import type { TextNodeShape } from './shapes/TextNodeShape'

const colors = [
  { name: 'white', hex: '#ffffff' },
  { name: 'grey', hex: '#9ca3af' },
  { name: 'light-violet', hex: '#c4b5fd' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'light-blue', hex: '#93c5fd' },
  { name: 'yellow', hex: '#fbbf24' },
  { name: 'orange', hex: '#f97316' },
  { name: 'green', hex: '#22c55e' },
  { name: 'light-green', hex: '#86efac' },
  { name: 'light-red', hex: '#fca5a5' },
  { name: 'red', hex: '#ef4444' },
]

export function PropertiesPanel() {
  const editor = useEditor()

  const selectedShape = useValue(
    'selected text node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null

      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'text-node') return null

      return shape as unknown as TextNodeShape
    },
    [editor]
  )

  if (!selectedShape) return null

  const handleColorChange = (colorName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.updateShape({
      id: selectedShape.id,
      type: 'text-node',
      props: { color: colorName },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-48 rounded-lg border border-zinc-700 bg-zinc-900/90 p-3 backdrop-blur-sm">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        Text Color
      </h3>
      <div className="grid grid-cols-6 gap-1.5">
        {colors.map((color) => (
          <button
            key={color.name}
            className={`h-6 w-6 rounded-md border-2 transition-transform hover:scale-110 ${
              selectedShape.props.color === color.name
                ? 'border-white'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color.hex }}
            onClick={() => handleColorChange(color.name)}
            title={color.name}
          />
        ))}
      </div>
    </div>
  )
}
