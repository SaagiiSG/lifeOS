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

const textGroupNodeShapeProps = {
    w: T.number,
    h: T.number,
    title: T.string,
}

type TextGroupNodeShapeProps = RecordPropsType<typeof textGroupNodeShapeProps>

export type TextGroupNodeShape = TLBaseShape<'text-group-node', TextGroupNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TextGroupNodeShapeUtil extends ShapeUtil<any> {
    static override type = 'text-group-node' as const
    static override props = textGroupNodeShapeProps

    getDefaultProps(): TextGroupNodeShapeProps {
        return {
            w: 300,
            h: 200,
            title: 'Note Group',
        }
    }

    getGeometry(shape: TextGroupNodeShape) {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    component(shape: TextGroupNodeShape) {
        const { title } = shape.props
        const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
        const isEditing = this.editor.getEditingShapeId() === shape.id

        // Count text nodes inside this group
        const getGroupStats = () => {
            const bounds = this.editor.getShapePageBounds(shape.id)
            if (!bounds) return 0

            return this.editor.getCurrentPageShapes().filter(s => {
                if ((s.type as string) !== 'text-node') return false
                const nodeBounds = this.editor.getShapePageBounds(s.id)
                return nodeBounds && bounds.contains(nodeBounds)
            }).length
        }

        const noteCount = getGroupStats()

        return (
            <HTMLContainer
                id={shape.id}
                style={{
                    width: shape.props.w,
                    height: shape.props.h,
                }}
            >
                <div
                    className={`relative h-full w-full rounded-xl border transition-all ${
                        isSelected
                            ? 'border-zinc-500/60 bg-zinc-500/[0.03]'
                            : 'border-zinc-700/40 bg-zinc-800/[0.02]'
                    }`}
                    style={{ pointerEvents: 'none' }}
                >
                    {/* Header */}
                    <div
                        className="absolute -top-3 left-3 flex items-center gap-1.5 bg-[#0a0a0a] px-2"
                        style={{ pointerEvents: 'all' }}
                    >
                        {isEditing ? (
                            <input
                                className="bg-transparent text-xs font-medium text-zinc-400 outline-none w-28"
                                value={title}
                                autoFocus
                                onChange={(e) => {
                                    this.editor.updateShape({
                                        id: shape.id,
                                        type: 'text-group-node',
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
                                className="text-xs font-medium text-zinc-500 cursor-text hover:text-zinc-300"
                                onClick={() => this.editor.setEditingShape(shape.id)}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {title}
                            </span>
                        )}
                    </div>

                    {/* Note count */}
                    {noteCount > 0 && (
                        <div className="absolute -bottom-2.5 right-3 bg-[#0a0a0a] px-1.5 text-[10px] text-zinc-600">
                            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                        </div>
                    )}
                </div>
            </HTMLContainer>
        )
    }

    indicator(shape: TextGroupNodeShape) {
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
    override onResize(shape: TextGroupNodeShape, info: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resizeBox(shape as any, info)
    }
}
