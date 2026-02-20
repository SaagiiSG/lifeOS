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
      w: 160,
      h: 80,
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

    const colorMap: Record<string, { border: string; ring: string }> = {
      blue: { border: 'border-blue-500/60', ring: 'ring-blue-500/20' },
      green: { border: 'border-green-500/60', ring: 'ring-green-500/20' },
      purple: { border: 'border-purple-500/60', ring: 'ring-purple-500/20' },
      orange: { border: 'border-orange-500/60', ring: 'ring-orange-500/20' },
      red: { border: 'border-red-500/60', ring: 'ring-red-500/20' },
      yellow: { border: 'border-yellow-500/60', ring: 'ring-yellow-500/20' },
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

    // Check dependencies (other tasks connected with arrows pointing TO this task)
    const getDependencies = () => {
      const allShapes = this.editor.getCurrentPageShapes()
      const connections = allShapes.filter((s) => (s as any).type === 'connection')

      const dependencies: { id: string; completed: boolean; title: string }[] = []

      // 1. Check direct task dependencies (Task A -> Task B means B depends on A)
      for (const conn of connections) {
        const connProps = (conn as any).props
        // If this task is the target (toId), the source (fromId) is a dependency
        if (connProps.toId === shape.id) {
          const sourceShape = this.editor.getShape(connProps.fromId)
          if (sourceShape && (sourceShape as any).type === 'task-node') {
            dependencies.push({
              id: sourceShape.id,
              completed: (sourceShape as any).props.completed,
              title: (sourceShape as any).props.title
            })
          }
        }
      }

      // 2. Check if this task's containing phase is locked via connections
      const taskBounds = this.editor.getShapePageBounds(shape.id)
      if (taskBounds) {
        const phases = allShapes.filter(s => (s as any).type === 'phase-node')
        const myPhase = phases.find(p => {
          const pBounds = this.editor.getShapePageBounds(p.id)
          return pBounds && pBounds.contains(taskBounds)
        })

        if (myPhase) {
          // Check connection-based phase dependencies (Phase A -> my Phase)
          for (const conn of connections) {
            const connProps = (conn as any).props
            if (connProps.toId === myPhase.id) {
              const sourceShape = this.editor.getShape(connProps.fromId)
              if (sourceShape && (sourceShape as any).type === 'phase-node') {
                // Check if source phase is complete (all tasks done)
                const sourceBounds = this.editor.getShapePageBounds(sourceShape.id)
                let sourceComplete = false

                if (sourceBounds) {
                  const sourceTasks = allShapes.filter(s => {
                    if ((s as any).type !== 'task-node') return false
                    const sBounds = this.editor.getShapePageBounds(s.id)
                    return sBounds && sourceBounds.contains(sBounds)
                  })
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sourceComplete = sourceTasks.length > 0 && sourceTasks.every(t => (t as any).props.completed)
                }

                if (!sourceComplete) {
                  dependencies.push({
                    id: sourceShape.id,
                    completed: false,
                    title: `Phase: ${(sourceShape as any).props.title}`
                  })
                }
              }
            }
          }

          // 3. Check phase index-based dependencies (legacy: Phase 1 -> Phase 2)
          const myPhaseIndex = (myPhase as any).props.phaseIndex
          const previousPhases = phases.filter(p => (p as any).props.phaseIndex < myPhaseIndex)

          for (const prevPhase of previousPhases) {
            // Skip if already tracked via connection dependency
            if (dependencies.some(d => d.id === prevPhase.id)) continue

            const prevPhaseBounds = this.editor.getShapePageBounds(prevPhase.id)
            if (prevPhaseBounds) {
              const tasksInPrevPhase = allShapes.filter(s => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((s as any).type !== 'task-node') return false
                const sBounds = this.editor.getShapePageBounds(s.id)
                return sBounds && prevPhaseBounds.contains(sBounds)
              })

              const incompleteTasks = tasksInPrevPhase.filter(t => !(t as any).props.completed)
              if (incompleteTasks.length > 0) {
                dependencies.push({
                  id: prevPhase.id,
                  completed: false,
                  title: `Phase ${(prevPhase as any).props.phaseIndex}: ${(prevPhase as any).props.title}`
                })
              }
            }
          }
        }
      }

      return dependencies
    }

    // Check if connected to a goal (to decide whether to show the + button)
    const isConnectedToGoal = () => {
      const allShapes = this.editor.getCurrentPageShapes()
      // quick check of connections
      const connections = allShapes.filter(s => (s as any).type === 'connection')

      // BFS/DFS or just direct connection?
      // The user said "connected to goal". Usually this implies a chain. 
      // For a simple implementation, let's look for ANY connection path to a goal?
      // OR strictly direct? "task node that is connected to goal"
      // Let's implement a recursive check or at least a strict check.
      // Given performance, let's stick to "Directly connected OR part of a chain that leads to a goal"
      // actually, checking simple direct connection or 1-hop might be enough for now, 
      // but typically "connected to goal" in this app means "Is part of the goal's tree".

      // Optimization: Just check if *any* connection involves this task. 
      // If it has connections, it's likely part of a flow.
      // But to be precise:
      const visited = new Set<string>()
      const queue = [shape.id]

      while (queue.length > 0) {
        const currentId = queue.shift()!
        if (visited.has(currentId)) continue
        visited.add(currentId)

        const currentShape = this.editor.getShape(currentId)
        if (currentShape && (currentShape as any).type === 'goal-node') return true

        // Find neighbors
        for (const conn of connections) {
          const props = (conn as any).props
          if (props.fromId === currentId && !visited.has(props.toId)) {
            queue.push(props.toId)
          }
          if (props.toId === currentId && !visited.has(props.fromId)) {
            queue.push(props.fromId)
          }
        }

        // Safety break
        if (visited.size > 20) break // limit search depth/width
      }
      return false
    }

    const showAddButton = isConnectedToGoal()

    const handleCreateDependentTask = (e: React.MouseEvent) => {
      e.stopPropagation()

      // 1. Calculate new position (to the right and slightly down, or just right)
      // const offset = { x: 200, y: 0 }
      const newX = shape.x + shape.props.w + 50
      const newY = shape.y // keep same level, or simple layout

      const newTaskId = createShapeId()

      this.editor.createShape({
        id: newTaskId,
        type: 'task-node',
        x: newX,
        y: newY,
        props: {
          title: 'New Task',
          description: '',
          completed: false,
          color: shape.props.color, // inherit color
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      // 2. Create connection (This Task -> New Task)
      // Arrow should point TO the new task, meaning New Task depends on This Task.
      const connId = createShapeId()
      this.editor.createShape({
        id: connId,
        type: 'connection',
        props: {
          fromId: shape.id,
          toId: newTaskId,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const dependencies = getDependencies()
    const isLocked = dependencies.some(d => !d.completed)

    const toggleComplete = () => {
      if (isLocked) return

      const newCompleted = !completed

      // Update the task(original content continues...)
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
          className={`glass-panel-frost ios-scale-in group flex h-full w-full flex-col rounded-xl p-3 transition-all duration-500 ${isLocked ? 'opacity-50 grayscale' : completed ? 'opacity-60' : ''
            } ${isSelected ? `${colors.border} ring-2 ${colors.ring} ring-offset-0` : colors.border}`}
          style={{
            pointerEvents: 'all',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {/* Header with checkbox */}
          <div className="mb-2 flex items-start gap-2">
            <button
              onClick={toggleComplete}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${isLocked
                ? 'cursor-not-allowed border-zinc-600 bg-zinc-800/50 text-zinc-500'
                : completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-zinc-500 hover:border-zinc-400'
                }`}
              title={isLocked ? `Blocked by: ${dependencies.filter(d => !d.completed).map(d => d.title).join(', ')}` : 'Toggle complete'}
            >
              {isLocked ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : completed && (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ animation: 'check-pop 300ms var(--ease-spring-heavy) both' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              {isEditing ? (
                <input
                  className={`w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-500 ${completed ? 'text-zinc-400 line-through' : 'text-white'
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
                  className={`cursor-text text-sm font-medium hover:opacity-80 ${completed ? 'text-zinc-400 line-through' : 'text-white'
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
            {/* Add Dependent Task Button */}
            {showAddButton && (
              <button
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-600 bg-zinc-800 text-zinc-400 opacity-0 transition-opacity hover:border-zinc-500 hover:bg-zinc-700 hover:text-white group-hover:opacity-100"
                onClick={handleCreateDependentTask}
                onPointerDown={(e) => e.stopPropagation()}
                title="Add dependent task"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Dependency indicator */}
          {dependencies.length > 0 && (
            <div className="mb-1.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-700/50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(dependencies.filter(d => d.completed).length / dependencies.length) * 100}%`,
                      backgroundColor: isLocked ? '#a1a1aa' : '#22c55e',
                    }}
                  />
                </div>
                <span className="shrink-0 text-[9px] tabular-nums text-zinc-500">
                  {dependencies.filter(d => d.completed).length}/{dependencies.length}
                </span>
              </div>
              {isLocked && (
                <div className="flex flex-wrap gap-1">
                  {dependencies.filter(d => !d.completed).map(dep => (
                    <span
                      key={dep.id}
                      className="inline-flex items-center gap-0.5 rounded bg-zinc-800/80 px-1 py-0.5 text-[8px] text-zinc-500"
                    >
                      <svg className="h-2 w-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {dep.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
