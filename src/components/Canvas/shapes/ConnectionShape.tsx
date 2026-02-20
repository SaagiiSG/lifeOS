'use client'

import {
  ShapeUtil,
  TLBaseShape,
  T,
  RecordPropsType,
  CubicBezier2d,
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

const COLOR_MAP: Record<string, string> = {
  zinc: '#a78bfa',
  blue: '#60a5fa',
  green: '#34d399',
  purple: '#c4b5fd',
  orange: '#fb923c',
  red: '#f87171',
  yellow: '#fbbf24',
  violet: '#a78bfa',
}

/**
 * Compute a perpendicular offset for a cubic bezier curve.
 * Shifts each control point along the curve normal by `offset` pixels.
 */
function offsetBezierPath(
  start: Vec,
  cp1: Vec,
  cp2: Vec,
  end: Vec,
  offset: number
): string {
  const points = [start, cp1, cp2, end]
  const shifted: Vec[] = []

  for (let i = 0; i < points.length; i++) {
    let tangentX: number, tangentY: number

    if (i === 0) {
      tangentX = points[1].x - points[0].x
      tangentY = points[1].y - points[0].y
    } else if (i === points.length - 1) {
      tangentX = points[i].x - points[i - 1].x
      tangentY = points[i].y - points[i - 1].y
    } else {
      tangentX = points[i + 1].x - points[i - 1].x
      tangentY = points[i + 1].y - points[i - 1].y
    }

    const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1
    // Normal is perpendicular to tangent
    const nx = -tangentY / len
    const ny = tangentX / len

    shifted.push(new Vec(points[i].x + nx * offset, points[i].y + ny * offset))
  }

  return `M ${shifted[0].x} ${shifted[0].y} C ${shifted[1].x} ${shifted[1].y} ${shifted[2].x} ${shifted[2].y} ${shifted[3].x} ${shifted[3].y}`
}

/** Deterministic pseudo-random number from seed, returns -1 to 1 */
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297) * 49979
  return (x - Math.floor(x)) * 2 - 1
}

/** Evaluate a point on a cubic bezier at parameter t */
function bezierPoint(start: Vec, cp1: Vec, cp2: Vec, end: Vec, t: number): Vec {
  const mt = 1 - t
  return new Vec(
    mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x,
    mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y
  )
}

/** Evaluate the tangent of a cubic bezier at parameter t */
function bezierTangent(start: Vec, cp1: Vec, cp2: Vec, end: Vec, t: number): Vec {
  const mt = 1 - t
  return new Vec(
    3 * mt * mt * (cp1.x - start.x) + 6 * mt * t * (cp2.x - cp1.x) + 3 * t * t * (end.x - cp2.x),
    3 * mt * mt * (cp1.y - start.y) + 6 * mt * t * (cp2.y - cp1.y) + 3 * t * t * (end.y - cp2.y)
  )
}

/**
 * Build a Catmull-Rom → cubic Bezier spline through a list of points.
 * Returns a path string starting with the first point (no leading M).
 */
function catmullRomSpline(points: Vec[]): string {
  let d = ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Generate a wiggly vine path as a filled ribbon shape (wide-narrow-wide).
 * Samples points along the curve, computes upper and lower edges using
 * a variable width profile, then returns a closed filled outline.
 */
function vinePathFromBezier(
  start: Vec,
  cp1: Vec,
  cp2: Vec,
  end: Vec,
  baseOffset: number,
  seed: number,
  wobbleAmount: number,
  segments: number = 8
): string {
  const maxWidth = 2.5
  const minWidth = 0.4

  const upperEdge: Vec[] = []
  const lowerEdge: Vec[] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const pt = bezierPoint(start, cp1, cp2, end, t)
    const tan = bezierTangent(start, cp1, cp2, end, t)
    const len = Math.sqrt(tan.x * tan.x + tan.y * tan.y) || 1
    const nx = -tan.y / len
    const ny = tan.x / len

    // Wobble fades to 0 at endpoints so vines converge at anchors
    const edgeFade = Math.sin(t * Math.PI)
    const wobble = seededRandom(seed, i) * wobbleAmount * edgeFade

    const totalOffset = baseOffset + wobble

    // Width profile: wide at endpoints, thin in the middle
    // sin(0)=0, sin(PI/2)=1, sin(PI)=0 → inverted = wide, thin, wide
    const halfWidth = (maxWidth - (maxWidth - minWidth) * Math.sin(t * Math.PI)) / 2

    const cx = pt.x + nx * totalOffset
    const cy = pt.y + ny * totalOffset

    upperEdge.push(new Vec(cx + nx * halfWidth, cy + ny * halfWidth))
    lowerEdge.push(new Vec(cx - nx * halfWidth, cy - ny * halfWidth))
  }

  // Build closed outline: forward along upper edge, backward along lower edge
  const reversedLower = [...lowerEdge].reverse()

  let d = `M ${upperEdge[0].x} ${upperEdge[0].y}`
  d += catmullRomSpline(upperEdge)
  d += ` L ${reversedLower[0].x} ${reversedLower[0].y}`
  d += catmullRomSpline(reversedLower)
  d += ' Z'

  return d
}

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
    if (!points) {
      return new CubicBezier2d({
        start: new Vec(0, 0),
        cp1: new Vec(0, 0),
        cp2: new Vec(0, 0),
        end: new Vec(0, 0),
      })
    }

    const { start, end, cp1, cp2 } = points
    return new CubicBezier2d({ start, cp1, cp2, end })
  }

  private getConnectionPoints(shape: ConnectionShape): { start: Vec; end: Vec; cp1: Vec; cp2: Vec } | null {
    const { fromId, toId, fromAnchor, toAnchor } = shape.props

    if (!fromId || !toId) return null

    const fromShape = this.editor.getShape(fromId as TLShapeId)
    const toShape = this.editor.getShape(toId as TLShapeId)

    if (!fromShape || !toShape) return null

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

    const start = getAnchorPoint(fromShape.x, fromShape.y, fromW, fromH, fromAnchor)
    const end = getAnchorPoint(toShape.x, toShape.y, toW, toH, toAnchor)

    const shapeX = shape.x
    const shapeY = shape.y

    const localStart = new Vec(start.x - shapeX, start.y - shapeY)
    const localEnd = new Vec(end.x - shapeX, end.y - shapeY)

    const dist = Vec.Dist(localStart, localEnd)
    const controlDist = Math.min(dist * 0.5, 150)

    let cp1 = new Vec(localStart.x, localStart.y)
    let cp2 = new Vec(localEnd.x, localEnd.y)

    switch (fromAnchor) {
      case 'top': cp1 = new Vec(localStart.x, localStart.y - controlDist); break
      case 'bottom': cp1 = new Vec(localStart.x, localStart.y + controlDist); break
      case 'left': cp1 = new Vec(localStart.x - controlDist, localStart.y); break
      case 'right': cp1 = new Vec(localStart.x + controlDist, localStart.y); break
    }

    switch (toAnchor) {
      case 'top': cp2 = new Vec(localEnd.x, localEnd.y - controlDist); break
      case 'bottom': cp2 = new Vec(localEnd.x, localEnd.y + controlDist); break
      case 'left': cp2 = new Vec(localEnd.x - controlDist, localEnd.y); break
      case 'right': cp2 = new Vec(localEnd.x + controlDist, localEnd.y); break
    }

    return { start: localStart, end: localEnd, cp1, cp2 }
  }

  component(shape: ConnectionShape) {
    const { color, style, label } = shape.props
    const points = this.getConnectionPoints(shape)
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)

    if (!points) return null

    const { start, end, cp1, cp2 } = points

    // Resolve source and target node colors for gradient
    const fromShape = this.editor.getShape(shape.props.fromId as TLShapeId)
    const toShape = this.editor.getShape(shape.props.toId as TLShapeId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromColor = COLOR_MAP[(fromShape?.props as any)?.color] || COLOR_MAP[color] || COLOR_MAP.zinc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toColor = COLOR_MAP[(toShape?.props as any)?.color] || COLOR_MAP[color] || COLOR_MAP.zinc

    const strokeDasharray =
      style === 'dashed' ? '8,4' : style === 'dotted' ? '2,4' : 'none'

    const pathData = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`

    // Deterministic seed from shape ID for vine tendril offsets
    const seed = shape.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
    const vineBaseOffsets = [
      ((seed * 7) % 11) - 5,
      ((seed * 13) % 15) - 7,
      ((seed * 19) % 19) - 9,
      ((seed * 23) % 13) - 6,
      ((seed * 31) % 17) - 8,
    ].map(v => v * 1.8)
    const vineWobbles = [10, 14, 12, 16, 11]
    const vineSeeds = [seed + 1, seed + 7, seed + 13, seed + 19, seed + 31]
    const vineOpacities = [0.3, 0.35, 0.25, 0.4, 0.28]
    const vineDelays = [0, 0.8, 1.6, 2.4, 3.2]

    // Label midpoint on bezier at t=0.5
    const t = 0.5
    const mt = 1 - t
    const midX = mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x
    const midY = mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y

    // Unique filter ID per shape to avoid SVG ID conflicts
    const filterId = `glow-${shape.id.replace(/[^a-zA-Z0-9]/g, '')}`
    const gradId = `${filterId}-grad`

    // Use fromColor for anchor dots (start=fromColor, end=toColor)
    const labelGlowColor = fromColor

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <defs>
          {/* Gradient from source to target color */}
          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          >
            <stop offset="0%" stopColor={fromColor} />
            <stop offset="100%" stopColor={toColor} />
          </linearGradient>
          {/* Glow filter for anchor points */}
          <filter id={`${filterId}-anchor`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          {/* Pulsing glow filter for vine tendrils */}
          <filter id={`${filterId}-pulse`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>

        {/* Vine tendrils - ribbon shapes, wide at anchors, thin in the middle */}
        {vineBaseOffsets.map((offset, i) => (
          <path
            key={i}
            d={vinePathFromBezier(start, cp1, cp2, end, offset, vineSeeds[i], vineWobbles[i])}
            fill={`url(#${gradId})`}
            stroke="none"
            opacity={vineOpacities[i]}
            style={{
              animation: 'connection-pulse-vine 4s ease-in-out infinite',
              animationDelay: `${vineDelays[i]}s`,
            }}
          />
        ))}

        {/* Core bright line */}
        <path
          d={pathData}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={isSelected ? 2.5 : 1.8}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Anchor glow - start point */}
        <circle
          cx={start.x}
          cy={start.y}
          r={8}
          fill={fromColor}
          filter={`url(#${filterId}-anchor)`}
          style={{ animation: 'connection-pulse 4s ease-in-out infinite' }}
        />
        <circle
          cx={start.x}
          cy={start.y}
          r={3}
          fill={fromColor}
          opacity={0.9}
        />

        {/* Anchor glow - end point */}
        <circle
          cx={end.x}
          cy={end.y}
          r={8}
          fill={toColor}
          filter={`url(#${filterId}-anchor)`}
          style={{ animation: 'connection-pulse 4s ease-in-out infinite' }}
        />
        <circle
          cx={end.x}
          cy={end.y}
          r={3}
          fill={toColor}
          opacity={0.9}
        />

        {/* Label as frosted pill */}
        {label && (
          <foreignObject
            x={midX - 50}
            y={midY - 14}
            width={100}
            height={28}
            style={{ overflow: 'visible' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <div
                style={{
                  background: 'rgba(20, 20, 22, 0.7)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid rgba(255, 255, 255, 0.06)`,
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontFamily: 'system-ui, sans-serif',
                  color: '#a1a1aa',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 8px ${labelGlowColor}33`,
                }}
              >
                {label}
              </div>
            </div>
          </foreignObject>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <>
            <circle cx={start.x} cy={start.y} r={5} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
            <circle cx={end.x} cy={end.y} r={5} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
          </>
        )}

        {/* Reverse dependency button at midpoint — shown when selected */}
        {isSelected && (
          <foreignObject
            x={midX - 14}
            y={midY - 14}
            width={28}
            height={28}
            style={{ overflow: 'visible' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'connection',
                    props: {
                      fromId: shape.props.toId,
                      toId: shape.props.fromId,
                      fromAnchor: shape.props.toAnchor,
                      toAnchor: shape.props.fromAnchor,
                    },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Reverse dependency direction"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(20, 20, 22, 0.85)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'all',
                  boxShadow: `0 0 12px ${labelGlowColor}22`,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = 'rgba(40, 40, 44, 0.95)';
                  (e.target as HTMLElement).style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'rgba(20, 20, 22, 0.85)';
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                  <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>
          </foreignObject>
        )}
      </svg>
    )
  }

  indicator(shape: ConnectionShape) {
    const points = this.getConnectionPoints(shape)
    if (!points) return null
    const { start, end, cp1, cp2 } = points

    const pathData = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
    return <path d={pathData} fill="none" />
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
