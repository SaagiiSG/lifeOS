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
import React from 'react'

/** Render a simple markdown string into React elements (supports **bold** and - lists) */
function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-3.5 space-y-0.5">
          {listItems}
        </ul>
      )
      listItems = []
    }
  }

  const renderInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index))
      }
      parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>)
      lastIndex = regex.lastIndex
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex))
    }
    return parts.length > 0 ? parts : [str]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listMatch = line.match(/^\s*- (.*)/)
    if (listMatch) {
      listItems.push(<li key={`li-${i}`}>{renderInline(listMatch[1])}</li>)
    } else {
      flushList()
      if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />)
      } else {
        elements.push(<span key={`p-${i}`} className="block">{renderInline(line)}</span>)
      }
    }
  }
  flushList()

  return elements
}

// Define the shape properties schema
const textNodeShapeProps = {
  w: T.number,
  h: T.number,
  text: T.string,
  description: T.string,
  color: T.string,
}

type TextNodeShapeProps = RecordPropsType<typeof textNodeShapeProps>

export type TextNodeShape = TLBaseShape<'text-node', TextNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TextNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'text-node' as const
  static override props = textNodeShapeProps

  getDefaultProps(): TextNodeShapeProps {
    return {
      w: 200,
      h: 100,
      text: '',
      description: '',
      color: 'white',
    }
  }

  getGeometry(shape: TextNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: TextNodeShape) {
    const { text, description, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, string> = {
      white: '#ffffff',
      black: '#1d1d1d',
      grey: '#9ca3af',
      'light-violet': '#c4b5fd',
      violet: '#8b5cf6',
      blue: '#3b82f6',
      'light-blue': '#93c5fd',
      yellow: '#fbbf24',
      orange: '#f97316',
      green: '#22c55e',
      'light-green': '#86efac',
      'light-red': '#fca5a5',
      red: '#ef4444',
    }

    const textColor = colorMap[color] || '#ffffff'

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: 'hidden',
        }}
      >
        <div
          className={`ios-scale-in flex h-full w-full flex-col overflow-hidden rounded-lg border bg-zinc-900/90 p-3 backdrop-blur-sm transition-all ${
            isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-zinc-700'
          }`}
          style={{
            color: textColor,
            pointerEvents: 'all',
          }}
        >
          {isEditing ? (
            <input
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-500"
              style={{ color: textColor }}
              value={text}
              placeholder="Click to add title..."
              autoFocus
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'text-node',
                  props: { text: e.target.value },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  this.editor.setEditingShape(null)
                }
                e.stopPropagation()
              }}
            />
          ) : (
            <div
              className="text-sm font-semibold cursor-text"
              onClick={(e) => {
                e.stopPropagation()
                this.editor.setEditingShape(shape.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {text || (
                <span className="text-zinc-500">Click to add title...</span>
              )}
            </div>
          )}
          {description && (
            <div className="mt-1 flex-1 overflow-hidden text-xs leading-relaxed opacity-60" style={{ color: textColor }}>
              {renderSimpleMarkdown(description)}
            </div>
          )}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: TextNodeShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        ry={8}
      />
    )
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
  override onResize(shape: TextNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: TextNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
