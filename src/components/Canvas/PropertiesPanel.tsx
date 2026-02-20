'use client'

import { useEditor, useValue } from 'tldraw'
import { useCallback, useRef } from 'react'
import { Type } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleDescriptionChange = useCallback((value: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.updateShape({
      id: selectedShape?.id,
      type: 'text-node',
      props: { description: value },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }, [editor, selectedShape?.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation()
    const ta = e.currentTarget

    // Cmd+B / Ctrl+B: wrap selection in **bold**
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const value = ta.value

      if (start !== end) {
        const selected = value.slice(start, end)
        // Toggle: if already wrapped in **, remove them
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
          const unwrapped = selected.slice(2, -2)
          const newValue = value.slice(0, start) + unwrapped + value.slice(end)
          handleDescriptionChange(newValue)
          requestAnimationFrame(() => {
            ta.selectionStart = start
            ta.selectionEnd = start + unwrapped.length
          })
        } else if (
          start >= 2 &&
          end <= value.length - 2 &&
          value.slice(start - 2, start) === '**' &&
          value.slice(end, end + 2) === '**'
        ) {
          // Selection is inside **, remove the surrounding markers
          const newValue = value.slice(0, start - 2) + selected + value.slice(end + 2)
          handleDescriptionChange(newValue)
          requestAnimationFrame(() => {
            ta.selectionStart = start - 2
            ta.selectionEnd = end - 2
          })
        } else {
          const wrapped = `**${selected}**`
          const newValue = value.slice(0, start) + wrapped + value.slice(end)
          handleDescriptionChange(newValue)
          requestAnimationFrame(() => {
            ta.selectionStart = start + 2
            ta.selectionEnd = end + 2
          })
        }
      } else {
        // No selection: insert **** and place cursor in middle
        const newValue = value.slice(0, start) + '****' + value.slice(end)
        handleDescriptionChange(newValue)
        requestAnimationFrame(() => {
          ta.selectionStart = start + 2
          ta.selectionEnd = start + 2
        })
      }
      return
    }

    // Enter: auto-continue list items
    if (e.key === 'Enter') {
      const value = ta.value
      const pos = ta.selectionStart
      // Find the current line
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1
      const currentLine = value.slice(lineStart, pos)
      const listMatch = currentLine.match(/^(\s*- )/)

      if (listMatch) {
        // If the line is just "- " with nothing after, clear the list prefix instead
        if (currentLine.trim() === '-') {
          e.preventDefault()
          const newValue = value.slice(0, lineStart) + '\n' + value.slice(pos)
          handleDescriptionChange(newValue)
          requestAnimationFrame(() => {
            ta.selectionStart = lineStart + 1
            ta.selectionEnd = lineStart + 1
          })
        } else {
          e.preventDefault()
          const prefix = listMatch[1]
          const insertion = '\n' + prefix
          const newValue = value.slice(0, pos) + insertion + value.slice(pos)
          handleDescriptionChange(newValue)
          requestAnimationFrame(() => {
            const newPos = pos + insertion.length
            ta.selectionStart = newPos
            ta.selectionEnd = newPos
          })
        }
      }
    }
  }, [handleDescriptionChange])

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
    <div className="w-full p-3">
      <div className="mb-4 flex items-center gap-2">
        <Type className="h-4 w-4 text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-300">Text Note</h3>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">
          Details
        </label>
        <Textarea
          ref={textareaRef}
          className="min-h-[150px] resize-y border-zinc-700 bg-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-blue-500"
          value={selectedShape.props.description}
          placeholder="Add detailed notes, SOPs, steps..."
          rows={6}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Cmd+B to bold | - space for lists
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Text Color
        </h3>
        <div className="grid grid-cols-6 gap-1.5">
          {colors.map((color) => (
            <button
              key={color.name}
              className={`h-6 w-6 rounded-md border-2 transition-transform hover:scale-110 ${selectedShape.props.color === color.name
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
    </div>
  )
}
