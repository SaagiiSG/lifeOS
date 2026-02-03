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

// Define the shape properties schema
const textNodeShapeProps = {
  w: T.number,
  h: T.number,
  text: T.string,
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
    const { text, color } = shape.props
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
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-lg border bg-zinc-900/90 p-3 backdrop-blur-sm transition-all ${
            isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-zinc-700'
          }`}
          style={{
            color: textColor,
            pointerEvents: isEditing ? 'all' : 'none',
          }}
        >
          {isEditing ? (
            <textarea
              className="h-full w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-500"
              style={{ color: textColor }}
              value={text}
              placeholder="Type your note..."
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
                if (e.key === 'Escape') {
                  this.editor.setEditingShape(null)
                }
                e.stopPropagation()
              }}
            />
          ) : (
            <div className="h-full w-full overflow-auto text-sm whitespace-pre-wrap">
              {text || (
                <span className="text-zinc-500">Double-click to edit...</span>
              )}
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
