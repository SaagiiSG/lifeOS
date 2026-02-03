'use client'

import { useState } from 'react'
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
} from 'tldraw'

const chartNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  chartType: T.string, // 'line' | 'bar' | 'pie' | 'area'
  data: T.arrayOf(
    T.object({
      label: T.string,
      value: T.number,
    })
  ),
  color: T.string,
}

type ChartNodeShapeProps = RecordPropsType<typeof chartNodeShapeProps>

export type ChartNodeShape = TLBaseShape<'chart-node', ChartNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ChartNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'chart-node' as const
  static override props = chartNodeShapeProps

  getDefaultProps(): ChartNodeShapeProps {
    return {
      w: 320,
      h: 220,
      title: 'New Chart',
      chartType: 'bar',
      data: [
        { label: 'Mon', value: 30 },
        { label: 'Tue', value: 45 },
        { label: 'Wed', value: 60 },
        { label: 'Thu', value: 35 },
        { label: 'Fri', value: 80 },
        { label: 'Sat', value: 55 },
        { label: 'Sun', value: 40 },
      ],
      color: 'violet',
    }
  }

  getGeometry(shape: ChartNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: ChartNodeShape) {
    const { title, chartType, data, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    // Find connected nodes
    const allShapes = this.editor.getCurrentPageShapes()
    const connections = allShapes.filter((s) => (s.type as string) === 'connection')

    // Find what's connected to this chart
    const connectedHabits: Array<{ id: string; name: string; checkIns: Array<{ date: string; completed: boolean }> }> = []
    const connectedGoals: Array<{ id: string; title: string }> = []
    const connectedTasks: Array<{ id: string; title: string; completed: boolean }> = []

    for (const conn of connections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connProps = conn.props as any
      if (connProps.fromId === shape.id || connProps.toId === shape.id) {
        const otherId = connProps.fromId === shape.id ? connProps.toId : connProps.fromId
        const otherShape = this.editor.getShape(otherId)

        if (otherShape) {
          const type = otherShape.type as string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = otherShape.props as any

          if (type === 'habit-node') {
            connectedHabits.push({
              id: otherId,
              name: props.name || 'Unnamed Habit',
              checkIns: props.checkIns || [],
            })
          } else if (type === 'goal-node') {
            connectedGoals.push({
              id: otherId,
              title: props.title || 'Unnamed Goal',
            })
          } else if (type === 'task-node') {
            connectedTasks.push({
              id: otherId,
              title: props.title || 'Unnamed Task',
              completed: props.completed || false,
            })
          }
        }
      }
    }

    // If goals are connected, also find tasks connected to those goals
    for (const goal of connectedGoals) {
      for (const conn of connections) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connProps = conn.props as any
        if (connProps.fromId === goal.id || connProps.toId === goal.id) {
          const taskId = connProps.fromId === goal.id ? connProps.toId : connProps.fromId
          const taskShape = this.editor.getShape(taskId)

          if (taskShape && (taskShape.type as string) === 'task-node') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const taskProps = taskShape.props as any
            // Avoid duplicates
            if (!connectedTasks.find(t => t.id === taskId)) {
              connectedTasks.push({
                id: taskId,
                title: taskProps.title || 'Unnamed Task',
                completed: taskProps.completed || false,
              })
            }
          }
        }
      }
    }

    // Determine data source and generate chart data
    let chartData = data
    let dataSource = 'manual'
    let dataSourceLabel = 'Manual Data'

    if (connectedHabits.length > 0) {
      // Generate habit completion data for last 7 days
      dataSource = 'habits'
      dataSourceLabel = `${connectedHabits.length} Habit${connectedHabits.length > 1 ? 's' : ''}`

      const today = new Date()
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      chartData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]

        // Count how many habits were completed on this day
        let completedCount = 0
        for (const habit of connectedHabits) {
          const checkIn = habit.checkIns.find(c => c.date === dateStr)
          if (checkIn?.completed) {
            completedCount++
          }
        }

        return {
          label: dayNames[date.getDay()],
          value: completedCount,
        }
      })
    } else if (connectedTasks.length > 0 || connectedGoals.length > 0) {
      // Show task completion as pie chart data
      dataSource = 'tasks'
      const totalTasks = connectedTasks.length
      const completedTasks = connectedTasks.filter(t => t.completed).length
      const pendingTasks = totalTasks - completedTasks

      dataSourceLabel = `${connectedGoals.length > 0 ? connectedGoals.length + ' Goal' + (connectedGoals.length > 1 ? 's' : '') + ' → ' : ''}${totalTasks} Task${totalTasks > 1 ? 's' : ''}`

      if (chartType === 'pie') {
        chartData = [
          { label: 'Done', value: completedTasks },
          { label: 'Pending', value: pendingTasks },
        ]
      } else {
        // Show individual tasks for bar/line charts
        chartData = connectedTasks.map(task => ({
          label: task.title.slice(0, 8) + (task.title.length > 8 ? '..' : ''),
          value: task.completed ? 100 : 0,
        }))
      }
    }

    const colorMap: Record<string, { bg: string; border: string; bar: string; line: string }> = {
      violet: { bg: 'bg-violet-950/80', border: 'border-violet-500', bar: '#8b5cf6', line: '#8b5cf6' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500', bar: '#3b82f6', line: '#3b82f6' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500', bar: '#22c55e', line: '#22c55e' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500', bar: '#f97316', line: '#f97316' },
      pink: { bg: 'bg-pink-950/80', border: 'border-pink-500', bar: '#ec4899', line: '#ec4899' },
      cyan: { bg: 'bg-cyan-950/80', border: 'border-cyan-500', bar: '#06b6d4', line: '#06b6d4' },
    }

    const colors = colorMap[color] || colorMap.violet

    const maxValue = Math.max(...chartData.map((d) => d.value), 1)
    const chartHeight = shape.props.h - 100 // Leave room for header and labels

    // Tooltip state
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null)

    const showTooltip = (x: number, y: number, label: string, value: number) => {
      setTooltip({ x, y, label, value })
    }

    const hideTooltip = () => {
      setTooltip(null)
    }

    const cycleChartType = () => {
      const types = ['bar', 'line', 'area', 'pie']
      const currentIndex = types.indexOf(chartType)
      const nextType = types[(currentIndex + 1) % types.length]
      this.editor.updateShape({
        id: shape.id,
        type: 'chart-node',
        props: { chartType: nextType },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const renderBarChart = () => {
      if (chartData.length === 0) return null
      const barWidth = Math.max(10, (shape.props.w - 60) / chartData.length - 8)
      return (
        <svg width={shape.props.w - 40} height={chartHeight} className="mt-2">
          {chartData.map((d, i) => {
            const barHeight = (d.value / maxValue) * (chartHeight - 20)
            const x = i * (barWidth + 8) + 4
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={chartHeight - barHeight - 15}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  fill={colors.bar}
                  rx={3}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    showTooltip(rect.left + rect.width / 2, rect.top - 10, d.label, d.value)
                  }}
                  onMouseLeave={hideTooltip}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize={9}
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      )
    }

    const renderLineChart = () => {
      if (chartData.length < 2) return renderBarChart()
      const pointSpacing = (shape.props.w - 60) / (chartData.length - 1)
      const points = chartData.map((d, i) => ({
        x: i * pointSpacing + 10,
        y: chartHeight - (d.value / maxValue) * (chartHeight - 20) - 15,
      }))
      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

      return (
        <svg width={shape.props.w - 40} height={chartHeight} className="mt-2">
          <path d={pathD} fill="none" stroke={colors.line} strokeWidth={2} />
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                fill={colors.line}
                className="cursor-pointer transition-all hover:r-8"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  showTooltip(rect.left + rect.width / 2, rect.top - 10, chartData[i].label, chartData[i].value)
                }}
                onMouseLeave={hideTooltip}
              />
              <text
                x={p.x}
                y={chartHeight - 2}
                textAnchor="middle"
                fill="#71717a"
                fontSize={9}
              >
                {chartData[i].label}
              </text>
            </g>
          ))}
        </svg>
      )
    }

    const renderAreaChart = () => {
      if (chartData.length < 2) return renderBarChart()
      const pointSpacing = (shape.props.w - 60) / (chartData.length - 1)
      const points = chartData.map((d, i) => ({
        x: i * pointSpacing + 10,
        y: chartHeight - (d.value / maxValue) * (chartHeight - 20) - 15,
      }))
      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - 15} L ${points[0].x} ${chartHeight - 15} Z`

      return (
        <svg width={shape.props.w - 40} height={chartHeight} className="mt-2">
          <path d={areaD} fill={colors.line} opacity={0.2} />
          <path d={pathD} fill="none" stroke={colors.line} strokeWidth={2} />
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill={colors.line}
                className="cursor-pointer opacity-0 transition-all hover:opacity-100"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  showTooltip(rect.left + rect.width / 2, rect.top - 10, chartData[i].label, chartData[i].value)
                }}
                onMouseLeave={hideTooltip}
              />
              <text
                x={p.x}
                y={chartHeight - 2}
                textAnchor="middle"
                fill="#71717a"
                fontSize={9}
              >
                {chartData[i].label}
              </text>
            </g>
          ))}
        </svg>
      )
    }

    const renderPieChart = () => {
      const total = chartData.reduce((sum, d) => sum + d.value, 0)
      if (total === 0) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No data
          </div>
        )
      }

      const cx = (shape.props.w - 40) / 2
      const cy = chartHeight / 2
      const radius = Math.min(cx, cy) - 20

      let currentAngle = -90

      const pieColors = dataSource === 'tasks'
        ? ['#22c55e', '#71717a'] // Green for done, gray for pending
        : ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308']

      return (
        <svg width={shape.props.w - 40} height={chartHeight} className="mt-2">
          {chartData.map((d, i) => {
            if (d.value === 0) return null
            const angle = (d.value / total) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle
            currentAngle = endAngle

            const startRad = (startAngle * Math.PI) / 180
            const endRad = (endAngle * Math.PI) / 180

            const x1 = cx + radius * Math.cos(startRad)
            const y1 = cy + radius * Math.sin(startRad)
            const x2 = cx + radius * Math.cos(endRad)
            const y2 = cy + radius * Math.sin(endRad)

            const largeArc = angle > 180 ? 1 : 0

            // Label position
            const midAngle = (startAngle + endAngle) / 2
            const midRad = (midAngle * Math.PI) / 180
            const labelX = cx + (radius * 0.6) * Math.cos(midRad)
            const labelY = cy + (radius * 0.6) * Math.sin(midRad)

            return (
              <g key={i}>
                <path
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={pieColors[i % pieColors.length]}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    showTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2, d.label, d.value)
                  }}
                  onMouseLeave={hideTooltip}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {d.value}
                </text>
              </g>
            )
          })}
          {/* Legend */}
          {chartData.map((d, i) => (
            <g key={`legend-${i}`}>
              <rect
                x={5}
                y={chartHeight - 20 - (chartData.length - 1 - i) * 14}
                width={8}
                height={8}
                fill={pieColors[i % pieColors.length]}
                rx={2}
              />
              <text
                x={16}
                y={chartHeight - 13 - (chartData.length - 1 - i) * 14}
                fill="#a1a1aa"
                fontSize={9}
              >
                {d.label}
              </text>
            </g>
          ))}
        </svg>
      )
    }

    const renderChart = () => {
      switch (chartType) {
        case 'line':
          return renderLineChart()
        case 'area':
          return renderAreaChart()
        case 'pie':
          return renderPieChart()
        default:
          return renderBarChart()
      }
    }

    const chartTypeLabels: Record<string, string> = {
      bar: 'Bar',
      line: 'Line',
      area: 'Area',
      pie: 'Pie',
    }

    const dataSourceColors: Record<string, string> = {
      manual: 'text-zinc-400',
      habits: 'text-green-400',
      tasks: 'text-blue-400',
    }

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} p-3 backdrop-blur-sm transition-all ${
            isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            {isEditing ? (
              <input
                className="flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-500"
                value={title}
                placeholder="Chart title..."
                autoFocus
                onChange={(e) => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'chart-node',
                    props: { title: e.target.value },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    this.editor.setEditingShape(null)
                  }
                }}
                onBlur={() => this.editor.setEditingShape(null)}
              />
            ) : (
              <h3
                className="cursor-text text-sm font-semibold text-white hover:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation()
                  this.editor.setEditingShape(shape.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {title || 'Click to add title...'}
              </h3>
            )}
            <button
              onClick={cycleChartType}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              {chartTypeLabels[chartType]}
            </button>
          </div>

          {/* Data Source Indicator */}
          {dataSource !== 'manual' && (
            <div className={`mb-1 text-[10px] font-medium ${dataSourceColors[dataSource]}`}>
              📊 {dataSourceLabel}
            </div>
          )}

          {/* Chart */}
          <div className="relative flex flex-1 items-center justify-center">
            {chartData.length > 0 ? renderChart() : (
              <div className="text-center text-xs text-zinc-500">
                Connect habits or goals<br />to see data
              </div>
            )}

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none fixed z-[200] rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs font-medium text-white shadow-lg"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="text-zinc-400">{tooltip.label}</div>
                <div className="text-center font-bold">{tooltip.value}</div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
            <span>
              {dataSource === 'habits'
                ? `Max: ${maxValue}/${connectedHabits.length}`
                : dataSource === 'tasks'
                  ? `${connectedTasks.filter(t => t.completed).length}/${connectedTasks.length} done`
                  : `${chartData.length} points`}
            </span>
            {dataSource === 'manual' && (
              <span className="text-zinc-600">Connect nodes for live data</span>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: ChartNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
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
  override onResize(shape: ChartNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: ChartNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
