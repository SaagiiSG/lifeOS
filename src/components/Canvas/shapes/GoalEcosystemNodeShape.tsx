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

const goalEcosystemNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  description: T.string,
  status: T.string,
  quarter: T.string,
  year: T.number,
  color: T.string,
}

type GoalEcosystemNodeShapeProps = RecordPropsType<typeof goalEcosystemNodeShapeProps>

export type GoalEcosystemNodeShape = TLBaseShape<'goal-ecosystem-node', GoalEcosystemNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GoalEcosystemNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'goal-ecosystem-node' as const
  static override props = goalEcosystemNodeShapeProps

  getDefaultProps(): GoalEcosystemNodeShapeProps {
    const now = new Date()
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)

    return {
      w: 900,
      h: 650,
      title: 'New Goal',
      description: '',
      status: 'active',
      quarter: `Q${currentQuarter}`,
      year: now.getFullYear(),
      color: 'blue',
    }
  }

  getGeometry(shape: GoalEcosystemNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: GoalEcosystemNodeShape) {
    const { title, description, status, quarter, year, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const SIDEBAR_WIDTH = 220

    const colorMap: Record<string, { border: string; accent: string; accentBg: string; ring: string; text: string }> = {
      blue: { border: 'border-blue-500/40', accent: 'bg-blue-500', accentBg: 'bg-blue-500/10', ring: 'ring-blue-500/20', text: 'text-blue-400' },
      green: { border: 'border-green-500/40', accent: 'bg-green-500', accentBg: 'bg-green-500/10', ring: 'ring-green-500/20', text: 'text-green-400' },
      purple: { border: 'border-purple-500/40', accent: 'bg-purple-500', accentBg: 'bg-purple-500/10', ring: 'ring-purple-500/20', text: 'text-purple-400' },
      orange: { border: 'border-orange-500/40', accent: 'bg-orange-500', accentBg: 'bg-orange-500/10', ring: 'ring-orange-500/20', text: 'text-orange-400' },
      red: { border: 'border-red-500/40', accent: 'bg-red-500', accentBg: 'bg-red-500/10', ring: 'ring-red-500/20', text: 'text-red-400' },
      yellow: { border: 'border-yellow-500/40', accent: 'bg-yellow-500', accentBg: 'bg-yellow-500/10', ring: 'ring-yellow-500/20', text: 'text-yellow-400' },
    }

    const colors = colorMap[color] || colorMap.blue

    // Calculate ecosystem stats from contained shapes
    const getEcosystemStats = () => {
      const bounds = this.editor.getShapePageBounds(shape.id)
      if (!bounds) return { totalTasks: 0, completedTasks: 0, totalPhases: 0, completedPhases: 0 }

      const allShapes = this.editor.getCurrentPageShapes()

      // Find tasks inside this ecosystem
      const tasksInEcosystem = allShapes.filter(s => {
        if ((s as any).type !== 'task-node') return false
        const sBounds = this.editor.getShapePageBounds(s.id)
        return sBounds && bounds.contains(sBounds)
      })

      // Find phases inside this ecosystem
      const phasesInEcosystem = allShapes.filter(s => {
        if ((s as any).type !== 'phase-node') return false
        const sBounds = this.editor.getShapePageBounds(s.id)
        return sBounds && bounds.contains(sBounds)
      })

      const totalTasks = tasksInEcosystem.length
      const completedTasks = tasksInEcosystem.filter(t => (t as any).props.completed).length

      // A phase is "complete" when ALL tasks inside it are complete
      let completedPhases = 0
      for (const phase of phasesInEcosystem) {
        const phaseBounds = this.editor.getShapePageBounds(phase.id)
        if (!phaseBounds) continue

        const tasksInPhase = tasksInEcosystem.filter(t => {
          const tBounds = this.editor.getShapePageBounds(t.id)
          return tBounds && phaseBounds.contains(tBounds)
        })

        if (tasksInPhase.length > 0 && tasksInPhase.every(t => (t as any).props.completed)) {
          completedPhases++
        }
      }

      return {
        totalTasks,
        completedTasks,
        totalPhases: phasesInEcosystem.length,
        completedPhases,
      }
    }

    const stats = getEcosystemStats()
    const overallProgress = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

    const handleCreatePhase = (e: React.MouseEvent) => {
      e.stopPropagation()

      const selectedIds = this.editor.getSelectedShapeIds().filter(id => {
        const s = this.editor.getShape(id)
        return s && (s as any).type === 'task-node'
      })

      if (selectedIds.length > 0) {
        // Wrap selected tasks in a phase
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const id of selectedIds) {
          const b = this.editor.getShapePageBounds(id)
          if (b) {
            minX = Math.min(minX, b.x)
            minY = Math.min(minY, b.y)
            maxX = Math.max(maxX, b.x + b.width)
            maxY = Math.max(maxY, b.y + b.height)
          }
        }

        const padding = 30
        const phaseId = createShapeId()
        this.editor.createShape({
          id: phaseId,
          type: 'phase-node',
          x: minX - padding,
          y: minY - padding,
          props: {
            w: maxX - minX + padding * 2,
            h: maxY - minY + padding * 2,
            title: `Phase ${stats.totalPhases + 1}`,
            phaseIndex: stats.totalPhases + 1,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        // Keep ecosystem behind phases so they're visible
        this.editor.sendToBack([shape.id])
      } else {
        // Create empty phase inside the workspace area
        const pageBounds = this.editor.getShapePageBounds(shape.id)
        if (!pageBounds) return

        const phaseX = pageBounds.x + SIDEBAR_WIDTH + 20 + (stats.totalPhases % 2) * 320
        const phaseY = pageBounds.y + 20 + Math.floor(stats.totalPhases / 2) * 230

        const phaseId = createShapeId()
        this.editor.createShape({
          id: phaseId,
          type: 'phase-node',
          x: phaseX,
          y: phaseY,
          props: {
            w: 300,
            h: 200,
            title: `Phase ${stats.totalPhases + 1}`,
            phaseIndex: stats.totalPhases + 1,
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        // Keep ecosystem behind phases so they're visible
        this.editor.sendToBack([shape.id])
      }
    }

    const handleCreateTask = (e: React.MouseEvent) => {
      e.stopPropagation()

      const pageBounds = this.editor.getShapePageBounds(shape.id)
      if (!pageBounds) return

      // Place in workspace area
      const taskX = pageBounds.x + SIDEBAR_WIDTH + 30 + (stats.totalTasks % 3) * 180
      const taskY = pageBounds.y + 30 + Math.floor(stats.totalTasks / 3) * 100

      const taskId = createShapeId()
      this.editor.createShape({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      // Keep ecosystem behind tasks so they're visible
      this.editor.sendToBack([shape.id])
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
          className={`ios-scale-in relative flex h-full w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
            isSelected ? `${colors.border} ring-2 ${colors.ring} ring-offset-0` : colors.border
          }`}
          style={{
            pointerEvents: 'all',
            fontFamily: 'var(--font-outfit)',
            background: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Left Sidebar */}
          <div
            className="flex h-full flex-col border-r border-white/[0.06]"
            style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
          >
            {/* Goal Title & Meta */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Title */}
              {isEditing ? (
                <input
                  className="mb-1 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-zinc-600"
                  value={title}
                  placeholder="Goal title..."
                  autoFocus
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'goal-ecosystem-node',
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
                <h2
                  className="mb-1 cursor-text text-lg font-bold text-white hover:text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    this.editor.setEditingShape(shape.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {title || 'Click to name goal...'}
                </h2>
              )}

              {/* Status + Quarter */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : status === 'archived'
                        ? 'bg-zinc-500/20 text-zinc-400'
                        : `${colors.accentBg} ${colors.text}`
                  }`}
                >
                  {status}
                </span>
                <span className="text-[10px] text-zinc-500">{quarter} {year}</span>
              </div>

              {/* Description */}
              {isEditing ? (
                <textarea
                  className="mb-4 w-full resize-none bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-600"
                  value={description}
                  placeholder="Describe your goal..."
                  rows={3}
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'goal-ecosystem-node',
                      props: { description: e.target.value },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              ) : (
                <p
                  className="mb-4 cursor-text text-xs text-zinc-500 hover:text-zinc-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    this.editor.setEditingShape(shape.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {description || 'Click to add description...'}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCreatePhase}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Create Phase
                </button>
                <button
                  onClick={handleCreateTask}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Task
                </button>
              </div>
            </div>

            {/* Progress Panel (bottom of sidebar) */}
            <div className="border-t border-white/[0.06] p-4">
              {/* Overall Progress */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Progress</span>
                  <span className={`text-sm font-bold ${overallProgress === 100 ? 'text-green-400' : colors.text}`}>
                    {overallProgress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${overallProgress === 100 ? 'bg-green-500' : colors.accent} transition-all duration-500 [transition-timing-function:var(--ease-spring)]`}
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Phases + Tasks stats */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">Phases</span>
                    <span className="text-zinc-400">{stats.completedPhases}/{stats.totalPhases}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${colors.accent} transition-all duration-300`}
                      style={{ width: stats.totalPhases > 0 ? `${(stats.completedPhases / stats.totalPhases) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">Tasks</span>
                    <span className="text-zinc-400">{stats.completedTasks}/{stats.totalTasks}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${colors.accent} transition-all duration-300`}
                      style={{ width: stats.totalTasks > 0 ? `${(stats.completedTasks / stats.totalTasks) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Workspace Area */}
          <div
            className="relative flex-1"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none',
            }}
          >
            {/* Empty state */}
            {stats.totalTasks === 0 && stats.totalPhases === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-zinc-600">
                  Create phases and tasks to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: GoalEcosystemNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
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
  override onResize(shape: GoalEcosystemNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: GoalEcosystemNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
