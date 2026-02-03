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

    const colorMap: Record<string, { bg: string; border: string; accent: string }> = {
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500', accent: 'bg-blue-500' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500', accent: 'bg-green-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500', accent: 'bg-purple-500' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500', accent: 'bg-orange-500' },
      red: { bg: 'bg-red-950/80', border: 'border-red-500', accent: 'bg-red-500' },
      yellow: { bg: 'bg-yellow-950/80', border: 'border-yellow-500', accent: 'bg-yellow-500' },
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

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} p-4 backdrop-blur-sm transition-all ${
            isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
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
                className={`h-full rounded-full ${colors.accent} transition-all duration-300`}
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
