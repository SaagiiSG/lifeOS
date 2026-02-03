'use client'

import {
  ShapeUtil,
  TLBaseShape,
  T,
  RecordPropsType,
  Polyline2d,
  Vec,
  TLShapeId,
} from 'tldraw'

const connectionShapeProps = {
  fromId: T.string,
  toId: T.string,
  fromAnchor: T.string, // 'top' | 'right' | 'bottom' | 'left' | 'center'
  toAnchor: T.string,
  color: T.string,
  style: T.string, // 'solid' | 'dashed' | 'dotted'
  label: T.string,
}

type ConnectionShapeProps = RecordPropsType<typeof connectionShapeProps>

export type ConnectionShape = TLBaseShape<'connection', ConnectionShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ConnectionShapeUtil extends ShapeUtil<any> {
  static override type = 'connection' as const
  static override props = connectionShapeProps

  getDefaultProps(): ConnectionShapeProps {
    return {
      fromId: '',
      toId: '',
      fromAnchor: 'right',
      toAnchor: 'left',
      color: 'zinc',
      style: 'solid',
      label: '',
    }
  }

  getGeometry(shape: ConnectionShape) {
    const points = this.getConnectionPoints(shape)
    return new Polyline2d({ points })
  }

  private getConnectionPoints(shape: ConnectionShape): Vec[] {
    const { fromId, toId, fromAnchor, toAnchor } = shape.props

    if (!fromId || !toId) {
      return [new Vec(0, 0), new Vec(100, 0)]
    }

    const fromShape = this.editor.getShape(fromId as TLShapeId)
    const toShape = this.editor.getShape(toId as TLShapeId)

    if (!fromShape || !toShape) {
      return [new Vec(0, 0), new Vec(100, 0)]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromProps = fromShape.props as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toProps = toShape.props as any

    const fromW = fromProps.w || 200
    const fromH = fromProps.h || 100
    const toW = toProps.w || 200
    const toH = toProps.h || 100

    const getAnchorPoint = (
      shapeX: number,
      shapeY: number,
      w: number,
      h: number,
      anchor: string
    ): Vec => {
      switch (anchor) {
        case 'top':
          return new Vec(shapeX + w / 2, shapeY)
        case 'right':
          return new Vec(shapeX + w, shapeY + h / 2)
        case 'bottom':
          return new Vec(shapeX + w / 2, shapeY + h)
        case 'left':
          return new Vec(shapeX, shapeY + h / 2)
        case 'center':
        default:
          return new Vec(shapeX + w / 2, shapeY + h / 2)
      }
    }

    const fromPoint = getAnchorPoint(fromShape.x, fromShape.y, fromW, fromH, fromAnchor)
    const toPoint = getAnchorPoint(toShape.x, toShape.y, toW, toH, toAnchor)

    // Convert to local coordinates (relative to this shape's position)
    const localFrom = new Vec(fromPoint.x - shape.x, fromPoint.y - shape.y)
    const localTo = new Vec(toPoint.x - shape.x, toPoint.y - shape.y)

    return [localFrom, localTo]
  }

  component(shape: ConnectionShape) {
    const { color, style, label } = shape.props
    const points = this.getConnectionPoints(shape)
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)

    if (points.length < 2) return null

    const [start, end] = points
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2

    const colorMap: Record<string, string> = {
      zinc: '#71717a',
      blue: '#3b82f6',
      green: '#22c55e',
      purple: '#8b5cf6',
      orange: '#f97316',
      red: '#ef4444',
      yellow: '#eab308',
    }

    const strokeColor = colorMap[color] || colorMap.zinc
    const strokeDasharray =
      style === 'dashed' ? '8,4' : style === 'dotted' ? '2,4' : 'none'

    // Calculate angle for arrow
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const arrowLength = 10
    const arrowAngle = Math.PI / 6

    const arrow1X = end.x - arrowLength * Math.cos(angle - arrowAngle)
    const arrow1Y = end.y - arrowLength * Math.sin(angle - arrowAngle)
    const arrow2X = end.x - arrowLength * Math.cos(angle + arrowAngle)
    const arrow2Y = end.y - arrowLength * Math.sin(angle + arrowAngle)

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {/* Main line */}
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={strokeColor}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />

        {/* Arrow head */}
        <polygon
          points={`${end.x},${end.y} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
          fill={strokeColor}
        />

        {/* Label */}
        {label && (
          <g>
            <rect
              x={midX - 30}
              y={midY - 10}
              width={60}
              height={20}
              rx={4}
              fill="#18181b"
              stroke={strokeColor}
              strokeWidth={1}
            />
            <text
              x={midX}
              y={midY + 4}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              fontFamily="system-ui"
            >
              {label}
            </text>
          </g>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <>
            <circle cx={start.x} cy={start.y} r={5} fill={strokeColor} />
            <circle cx={end.x} cy={end.y} r={5} fill={strokeColor} />
          </>
        )}
      </svg>
    )
  }

  indicator(shape: ConnectionShape) {
    const points = this.getConnectionPoints(shape)
    if (points.length < 2) return null
    const [start, end] = points

    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        strokeWidth={2}
      />
    )
  }

  override canEdit() {
    return false
  }

  override canResize() {
    return false
  }

  override canBind() {
    return false
  }
}
