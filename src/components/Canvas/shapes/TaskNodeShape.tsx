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

const taskNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  description: T.string,
  completed: T.boolean,
  dueDate: T.string,
  priority: T.string,
  color: T.string,
}

type TaskNodeShapeProps = RecordPropsType<typeof taskNodeShapeProps>

export type TaskNodeShape = TLBaseShape<'task-node', TaskNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TaskNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'task-node' as const
  static override props = taskNodeShapeProps

  getDefaultProps(): TaskNodeShapeProps {
    return {
      w: 240,
      h: 120,
      title: 'New Task',
      description: '',
      completed: false,
      dueDate: '',
      priority: 'medium',
      color: 'blue',
    }
  }

  getGeometry(shape: TaskNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: TaskNodeShape) {
    const { title, description, completed, dueDate, priority, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; border: string }> = {
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500' },
      red: { bg: 'bg-red-950/80', border: 'border-red-500' },
      yellow: { bg: 'bg-yellow-950/80', border: 'border-yellow-500' },
    }

    const priorityConfig: Record<string, { color: string; label: string }> = {
      low: { color: 'text-zinc-400', label: 'Low' },
      medium: { color: 'text-yellow-400', label: 'Med' },
      high: { color: 'text-red-400', label: 'High' },
    }

    const colors = colorMap[color] || colorMap.blue
    const priorityInfo = priorityConfig[priority] || priorityConfig.medium

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const isOverdue = () => {
      if (!dueDate || completed) return false
      return new Date(dueDate) < new Date()
    }

    const toggleComplete = () => {
      const newCompleted = !completed

      // Update the task
      this.editor.updateShape({
        id: shape.id,
        type: 'task-node',
        props: { completed: newCompleted },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      // Find all connections involving this task and update connected goals
      const allShapes = this.editor.getCurrentPageShapes()
      const connections = allShapes.filter((s) => (s.type as string) === 'connection')

      // Find goals connected to this task
      const connectedGoalIds = new Set<string>()

      for (const conn of connections) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connProps = conn.props as any
        if (connProps.fromId === shape.id || connProps.toId === shape.id) {
          const otherId = connProps.fromId === shape.id ? connProps.toId : connProps.fromId
          const otherShape = this.editor.getShape(otherId)
          if (otherShape && (otherShape.type as string) === 'goal-node') {
            connectedGoalIds.add(otherId)
          }
        }
      }

      // Update each connected goal's progress
      for (const goalId of connectedGoalIds) {
        // Find all tasks connected to this goal
        const connectedTasks: { id: string; completed: boolean }[] = []

        for (const conn of connections) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const connProps = conn.props as any
          if (connProps.fromId === goalId || connProps.toId === goalId) {
            const taskId = connProps.fromId === goalId ? connProps.toId : connProps.fromId
            const taskShape = this.editor.getShape(taskId)
            if (taskShape && (taskShape.type as string) === 'task-node') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const taskProps = taskShape.props as any
              // Use the new completed state for the current task
              const isCompleted = taskShape.id === shape.id ? newCompleted : taskProps.completed
              connectedTasks.push({ id: taskId, completed: isCompleted })
            }
          }
        }

        // Calculate new progress
        if (connectedTasks.length > 0) {
          const completedCount = connectedTasks.filter((t) => t.completed).length
          const newProgress = Math.round((completedCount / connectedTasks.length) * 100)

          // Update goal progress
          this.editor.updateShape({
            id: goalId,
            type: 'goal-node',
            props: { progress: newProgress },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        }
      }
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
            completed ? 'opacity-60' : ''
          } ${isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'}`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header with checkbox */}
          <div className="mb-2 flex items-start gap-2">
            <button
              onClick={toggleComplete}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-zinc-500 hover:border-zinc-400'
              }`}
            >
              {completed && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              {isEditing ? (
                <input
                  className={`w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-500 ${
                    completed ? 'text-zinc-400 line-through' : 'text-white'
                  }`}
                  value={title}
                  placeholder="Task title..."
                  autoFocus
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'task-node',
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
                  className={`cursor-text text-sm font-medium hover:opacity-80 ${
                    completed ? 'text-zinc-400 line-through' : 'text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    this.editor.setEditingShape(shape.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {title || 'Click to name task...'}
                </h3>
              )}
            </div>
          </div>

          {/* Description */}
          {isEditing ? (
            <textarea
              className="mb-2 flex-1 resize-none bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-600"
              value={description}
              placeholder="Add description..."
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'task-node',
                  props: { description: e.target.value },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="mb-2 flex-1 cursor-text overflow-hidden text-xs text-zinc-400 hover:text-zinc-300"
              onClick={(e) => {
                e.stopPropagation()
                this.editor.setEditingShape(shape.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {description || 'Click to add description...'}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${priorityInfo.color}`}>{priorityInfo.label}</span>
              {dueDate && (
                <span className={isOverdue() ? 'text-red-400' : 'text-zinc-500'}>
                  {formatDate(dueDate)}
                  {isOverdue() && ' (overdue)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: TaskNodeShape) {
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
  override onResize(shape: TaskNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: TaskNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
