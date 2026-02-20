'use client'

import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
  createShapeId,
} from 'tldraw'

// Define the shape properties schema
const goalNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  description: T.string,
  quarter: T.string, // e.g., "Q1 2026"
  targetDate: T.string,
  progress: T.number,
  status: T.string,
  color: T.string,
  rolledOverFrom: T.string, // Previous quarter if rolled over
  milestones: T.arrayOf(T.object({
    id: T.string,
    title: T.string,
    completed: T.boolean,
  })),
  checkIns: T.arrayOf(T.object({
    id: T.string,
    date: T.string,
    progress: T.number,
    notes: T.string,
  })),
}

type GoalNodeShapeProps = RecordPropsType<typeof goalNodeShapeProps>

export type GoalNodeShape = TLBaseShape<'goal-node', GoalNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GoalNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'goal-node' as const
  static override props = goalNodeShapeProps

  getDefaultProps(): GoalNodeShapeProps {
    // Default to current quarter
    const now = new Date()
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
    const currentYear = now.getFullYear()

    return {
      w: 280,
      h: 200,
      title: 'New Goal',
      description: '',
      quarter: `Q${currentQuarter} ${currentYear}`,
      targetDate: '',
      progress: 0,
      status: 'active',
      color: 'blue',
      rolledOverFrom: '',
      milestones: [],
      checkIns: [],
    }
  }

  getGeometry(shape: GoalNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: GoalNodeShape) {
    const { title, description, progress, status, color, targetDate, milestones, quarter, rolledOverFrom } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { border: string; accent: string; ring: string }> = {
      blue: { border: 'border-blue-500/60', accent: 'bg-blue-500', ring: 'ring-blue-500/20' },
      green: { border: 'border-green-500/60', accent: 'bg-green-500', ring: 'ring-green-500/20' },
      purple: { border: 'border-purple-500/60', accent: 'bg-purple-500', ring: 'ring-purple-500/20' },
      orange: { border: 'border-orange-500/60', accent: 'bg-orange-500', ring: 'ring-orange-500/20' },
      red: { border: 'border-red-500/60', accent: 'bg-red-500', ring: 'ring-red-500/20' },
      yellow: { border: 'border-yellow-500/60', accent: 'bg-yellow-500', ring: 'ring-yellow-500/20' },
    }

    const colors = colorMap[color] || colorMap.blue
    const completedMilestones = milestones.filter((m) => m.completed).length

    // Find connected tasks
    const allShapes = this.editor.getCurrentPageShapes()
    const connections = allShapes.filter((s) => (s.type as string) === 'connection')

    let connectedTasksCount = 0
    let completedTasksCount = 0

    for (const conn of connections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connProps = conn.props as any
      if (connProps.fromId === shape.id || connProps.toId === shape.id) {
        const taskId = connProps.fromId === shape.id ? connProps.toId : connProps.fromId
        const taskShape = this.editor.getShape(taskId)
        if (taskShape && (taskShape.type as string) === 'task-node') {
          connectedTasksCount++
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((taskShape.props as any).completed) {
            completedTasksCount++
          }
        }
      }
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const getDaysRemaining = (dateStr: string) => {
      if (!dateStr) return null
      const target = new Date(dateStr)
      const now = new Date()
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diff
    }

    const daysRemaining = getDaysRemaining(targetDate)

    const addTask = (e: React.MouseEvent) => {
      e.stopPropagation()

      const taskId = createShapeId()
      const connectionId = createShapeId()

      // Place task to the right of the goal node
      const taskX = shape.x + shape.props.w + 60
      const taskY = shape.y + (shape.props.h / 2) - 40

      this.editor.createShapes([
        {
          id: taskId,
          type: 'task-node',
          x: taskX,
          y: taskY,
          props: {
            w: 160,
            h: 80,
            title: 'New Task',
            description: '',
            completed: false,
            dueDate: '',
            priority: 'medium',
            color,
          },
        },
        {
          id: connectionId,
          type: 'connection',
          x: 0,
          y: 0,
          props: {
            fromId: shape.id,
            toId: taskId,
            fromAnchor: 'right',
            toAnchor: 'left',
            color,
            style: 'solid',
            label: '',
          },
        },
      ])

      // Select the new task and start editing
      this.editor.select(taskId)
      this.editor.setEditingShape(taskId)
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
          className={`glass-panel-frost ios-scale-in relative flex h-full w-full flex-col rounded-xl p-4 transition-all ${
            isSelected ? `${colors.border} ring-2 ${colors.ring} ring-offset-0` : colors.border
          }`}
          style={{
            fontFamily: 'var(--font-outfit)',
            pointerEvents: 'all',
          }}
        >
          {/* Add Task button on the right side */}
          {isSelected && (
            <button
              onClick={addTask}
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute -right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 translate-x-full items-center justify-center rounded-full border ${colors.border} text-white transition-all hover:scale-110 backdrop-blur-xl`}
              style={{ background: 'rgba(20, 20, 22, 0.7)' }}
              title="Add Task"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <input
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-zinc-500"
                  value={title}
                  placeholder="Goal title..."
                  autoFocus
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'goal-node',
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
                  className="cursor-text text-lg font-semibold text-white hover:text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    this.editor.setEditingShape(shape.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {title || 'Click to name goal...'}
                </h3>
              )}
              {/* Quarter Badge */}
              {quarter && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">{quarter}</span>
                  {rolledOverFrom && (
                    <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                      from {rolledOverFrom}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : status === 'archived'
                    ? 'bg-zinc-500/20 text-zinc-400'
                    : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {status}
            </div>
          </div>

          {/* Description */}
          {isEditing ? (
            <textarea
              className="mb-3 flex-1 resize-none bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-500"
              value={description}
              placeholder="Describe your goal..."
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'goal-node',
                  props: { description: e.target.value },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="mb-3 flex-1 overflow-hidden text-sm text-zinc-400">
              {description || 'No description'}
            </p>
          )}

          {/* Target Date & Days Remaining */}
          {targetDate && (
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Target: {formatDate(targetDate)}</span>
              {daysRemaining !== null && (
                <span
                  className={`font-medium ${
                    daysRemaining < 0
                      ? 'text-red-400'
                      : daysRemaining < 7
                        ? 'text-yellow-400'
                        : 'text-zinc-400'
                  }`}
                >
                  {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)}d overdue`
                    : daysRemaining === 0
                      ? 'Due today'
                      : `${daysRemaining}d left`}
                </span>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Progress</span>
              <span className="font-medium text-white">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${colors.accent} transition-all duration-500 [transition-timing-function:var(--ease-spring)]`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>

          {/* Connected Tasks */}
          {connectedTasksCount > 0 && (
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Connected Tasks</span>
              <span className={completedTasksCount === connectedTasksCount ? 'text-green-400' : ''}>
                {completedTasksCount}/{connectedTasksCount} done
              </span>
            </div>
          )}

          {/* Milestones Summary */}
          {milestones.length > 0 && (
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Milestones</span>
              <span>
                {completedMilestones}/{milestones.length} complete
              </span>
            </div>
          )}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: GoalNodeShape) {
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
  override onResize(shape: GoalNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: GoalNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
