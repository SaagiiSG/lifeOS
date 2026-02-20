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

const phaseNodeShapeProps = {
    w: T.number,
    h: T.number,
    title: T.string,
    phaseIndex: T.number,
}

type PhaseNodeShapeProps = RecordPropsType<typeof phaseNodeShapeProps>

export type PhaseNodeShape = TLBaseShape<'phase-node', PhaseNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PhaseNodeShapeUtil extends ShapeUtil<any> {
    static override type = 'phase-node' as const
    static override props = phaseNodeShapeProps

    getDefaultProps(): PhaseNodeShapeProps {
        return {
            w: 300,
            h: 200,
            title: 'Phase 1',
            phaseIndex: 1,
        }
    }

    getGeometry(shape: PhaseNodeShape) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    component(shape: PhaseNodeShape) {
        const { title, phaseIndex } = shape.props
        const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
        const isEditing = this.editor.getEditingShapeId() === shape.id

        // Calculate completion of contained tasks
        const getPhaseStats = () => {
            const bounds = this.editor.getShapePageBounds(shape.id)
            if (!bounds) return { total: 0, completed: 0 }

            const tasksInPhase = this.editor.getCurrentPageShapes().filter(s => {
                if ((s.type as string) !== 'task-node') return false
                const taskBounds = this.editor.getShapePageBounds(s.id)
                return taskBounds && bounds.contains(taskBounds)
            })

            const total = tasksInPhase.length
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completed = tasksInPhase.filter(t => (t.props as any).completed).length

            return { total, completed }
        }

        // Check dependencies via connections (Phase A -> Phase B means B depends on A)
        const getDependencies = () => {
            const allShapes = this.editor.getCurrentPageShapes()
            const connections = allShapes.filter((s) => (s as any).type === 'connection')

            const dependencies: { id: string; title: string; isComplete: boolean }[] = []

            for (const conn of connections) {
                const connProps = (conn as any).props
                if (connProps.toId === shape.id) {
                    const sourceShape = this.editor.getShape(connProps.fromId)
                    if (sourceShape && (sourceShape as any).type === 'phase-node') {
                        // Check if source phase is complete (all its tasks done)
                        const sourceBounds = this.editor.getShapePageBounds(sourceShape.id)
                        let sourceComplete = false

                        if (sourceBounds) {
                            const sourceTasks = allShapes.filter(s => {
                                if ((s as any).type !== 'task-node') return false
                                const sBounds = this.editor.getShapePageBounds(s.id)
                                return sBounds && sourceBounds.contains(sBounds)
                            })

                            sourceComplete = sourceTasks.length > 0 &&
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                sourceTasks.every(t => (t.props as any).completed)
                        }

                        dependencies.push({
                            id: sourceShape.id,
                            title: (sourceShape as any).props.title,
                            isComplete: sourceComplete,
                        })
                    }
                }
            }

            return dependencies
        }

        const { total, completed } = getPhaseStats()
        const progressPercent = total > 0 ? (completed / total) * 100 : 0
        const isPhaseComplete = total > 0 && completed === total

        const dependencies = getDependencies()
        const isLocked = dependencies.some(d => !d.isComplete)
        const completedDeps = dependencies.filter(d => d.isComplete).length

        return (
            <HTMLContainer
                id={shape.id}
                style={{
                    width: shape.props.w,
                    height: shape.props.h,
                }}
            >
                <div
                    className={`relative h-full w-full rounded-2xl border border-dashed transition-all duration-500 ${
                        isLocked
                            ? 'border-zinc-700/40 bg-zinc-900/30 opacity-50 grayscale'
                            : isPhaseComplete
                                ? 'border-green-500/40 bg-green-500/[0.03]'
                                : isSelected
                                    ? 'border-blue-500/60 bg-blue-500/[0.03]'
                                    : 'border-white/[0.08] bg-white/[0.01]'
                    }`}
                    style={{ pointerEvents: 'none', fontFamily: 'var(--font-outfit)' }}
                >
                    {/* Header / Label */}
                    <div className="absolute -top-4 left-4 flex items-center gap-2 bg-[#0a0a0a] px-2" style={{ pointerEvents: 'all' }}>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isLocked
                                ? 'bg-zinc-700/30 text-zinc-500'
                                : isPhaseComplete
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-blue-500/20 text-blue-400'
                        }`}>
                            {isLocked ? (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            ) : isPhaseComplete ? (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                phaseIndex
                            )}
                        </div>
                        {isEditing ? (
                            <input
                                className="w-32 bg-transparent text-sm font-semibold text-zinc-300 outline-none"
                                value={title}
                                autoFocus
                                onChange={(e) => {
                                    this.editor.updateShape({
                                        id: shape.id,
                                        type: 'phase-node',
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
                            <span
                                className={`text-sm font-semibold cursor-text hover:text-white ${
                                    isLocked ? 'text-zinc-500' : 'text-zinc-300'
                                }`}
                                onClick={() => this.editor.setEditingShape(shape.id)}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {title}
                            </span>
                        )}
                    </div>

                    {/* Dependency indicator (top right) */}
                    {dependencies.length > 0 && (
                        <div className="absolute -top-4 right-4 flex items-center gap-1.5 bg-[#0a0a0a] px-2" style={{ pointerEvents: 'all' }}>
                            <div className="flex items-center gap-1">
                                {dependencies.map((dep) => (
                                    <div
                                        key={dep.id}
                                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                            dep.isComplete ? 'bg-green-500' : 'bg-zinc-600'
                                        }`}
                                        title={`${dep.title}: ${dep.isComplete ? 'Complete' : 'Incomplete'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-[9px] tabular-nums text-zinc-500">
                                {completedDeps}/{dependencies.length}
                            </span>
                        </div>
                    )}

                    {/* Blocker pills when locked */}
                    {isLocked && (
                        <div className="absolute left-4 top-4 flex flex-wrap gap-1" style={{ pointerEvents: 'all' }}>
                            {dependencies.filter(d => !d.isComplete).map(dep => (
                                <span
                                    key={dep.id}
                                    className="inline-flex items-center gap-0.5 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-500"
                                >
                                    <svg className="h-2 w-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    {dep.title}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Progress Indicator */}
                    {total > 0 && (
                        <div className="absolute -bottom-3 right-4 flex items-center gap-2 bg-[#0a0a0a] px-2 text-xs text-zinc-500">
                            <span>{completed}/{total}</span>
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        isPhaseComplete ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </HTMLContainer>
        )
    }

    indicator(shape: PhaseNodeShape) {
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
    override onResize(shape: PhaseNodeShape, info: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resizeBox(shape as any, info)
    }

    // Constrain phase movement within parent goal ecosystem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override onTranslate(_initial: PhaseNodeShape, current: PhaseNodeShape): any {
        const SIDEBAR_WIDTH = 220
        const PADDING = 8

        // Find the ecosystem that contains this phase
        const allShapes = this.editor.getCurrentPageShapes()
        const ecosystems = allShapes.filter(s => (s.type as string) === 'goal-ecosystem-node')

        for (const eco of ecosystems) {
            const ecoBounds = this.editor.getShapePageBounds(eco.id)
            if (!ecoBounds) continue

            // Check if the phase was initially inside this ecosystem
            const initialBounds = this.editor.getShapePageBounds(_initial.id)
            if (!initialBounds || !ecoBounds.contains(initialBounds)) continue

            // Clamp position within ecosystem workspace area
            const workspaceLeft = ecoBounds.x + SIDEBAR_WIDTH + PADDING
            const workspaceTop = ecoBounds.y + PADDING
            const workspaceRight = ecoBounds.x + ecoBounds.width - PADDING
            const workspaceBottom = ecoBounds.y + ecoBounds.height - PADDING

            const clampedX = Math.min(
                Math.max(current.x, workspaceLeft),
                workspaceRight - current.props.w
            )
            const clampedY = Math.min(
                Math.max(current.y, workspaceTop),
                workspaceBottom - current.props.h
            )

            if (clampedX !== current.x || clampedY !== current.y) {
                return {
                    ...current,
                    x: clampedX,
                    y: clampedY,
                }
            }

            break
        }
    }
}
