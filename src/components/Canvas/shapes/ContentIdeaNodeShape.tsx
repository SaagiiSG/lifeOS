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

const contentIdeaNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  platform: T.string, // 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin'
  caption: T.string,
  status: T.string, // 'idea' | 'drafted' | 'scheduled' | 'posted'
  scheduledDate: T.string,
  hashtags: T.arrayOf(T.string),
  color: T.string,
}

type ContentIdeaNodeShapeProps = RecordPropsType<typeof contentIdeaNodeShapeProps>

export type ContentIdeaNodeShape = TLBaseShape<'content-idea-node', ContentIdeaNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ContentIdeaNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'content-idea-node' as const
  static override props = contentIdeaNodeShapeProps

  getDefaultProps(): ContentIdeaNodeShapeProps {
    return {
      w: 260,
      h: 180,
      title: 'New Content Idea',
      platform: 'instagram',
      caption: '',
      status: 'idea',
      scheduledDate: '',
      hashtags: [],
      color: 'pink',
    }
  }

  getGeometry(shape: ContentIdeaNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: ContentIdeaNodeShape) {
    const { title, platform, caption, status, scheduledDate, hashtags, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; border: string }> = {
      pink: { bg: 'bg-pink-950/80', border: 'border-pink-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500' },
      cyan: { bg: 'bg-cyan-950/80', border: 'border-cyan-500' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500' },
    }

    const platformConfig: Record<string, { icon: string; color: string; name: string }> = {
      instagram: { icon: '📸', color: 'text-pink-400', name: 'Instagram' },
      youtube: { icon: '🎬', color: 'text-red-400', name: 'YouTube' },
      tiktok: { icon: '🎵', color: 'text-cyan-400', name: 'TikTok' },
      twitter: { icon: '𝕏', color: 'text-zinc-400', name: 'X/Twitter' },
      linkedin: { icon: '💼', color: 'text-blue-400', name: 'LinkedIn' },
    }

    const statusConfig: Record<string, { color: string; label: string }> = {
      idea: { color: 'bg-zinc-600', label: 'Idea' },
      drafted: { color: 'bg-yellow-600', label: 'Drafted' },
      scheduled: { color: 'bg-blue-600', label: 'Scheduled' },
      posted: { color: 'bg-green-600', label: 'Posted' },
    }

    const colors = colorMap[color] || colorMap.pink
    const platformInfo = platformConfig[platform] || platformConfig.instagram
    const statusInfo = statusConfig[status] || statusConfig.idea

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }

    const cycleStatus = () => {
      const statusOrder = ['idea', 'drafted', 'scheduled', 'posted']
      const currentIndex = statusOrder.indexOf(status)
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
      this.editor.updateShape({
        id: shape.id,
        type: 'content-idea-node',
        props: { status: nextStatus },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const cyclePlatform = () => {
      const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin']
      const currentIndex = platforms.indexOf(platform)
      const nextPlatform = platforms[(currentIndex + 1) % platforms.length]
      this.editor.updateShape({
        id: shape.id,
        type: 'content-idea-node',
        props: { platform: nextPlatform },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
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
            <button
              onClick={cyclePlatform}
              onPointerDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium ${platformInfo.color} hover:bg-zinc-700`}
            >
              <span>{platformInfo.icon}</span>
              <span>{platformInfo.name}</span>
            </button>
            <button
              onClick={cycleStatus}
              onPointerDown={(e) => e.stopPropagation()}
              className={`rounded px-2 py-0.5 text-xs font-medium text-white ${statusInfo.color} hover:opacity-80`}
            >
              {statusInfo.label}
            </button>
          </div>

          {/* Title */}
          <div className="mb-2">
            {isEditing ? (
              <input
                className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-500"
                value={title}
                placeholder="Content idea..."
                autoFocus
                onChange={(e) => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'content-idea-node',
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
                {title || 'Click to add idea...'}
              </h3>
            )}
          </div>

          {/* Caption */}
          {isEditing ? (
            <textarea
              className="mb-2 flex-1 resize-none bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-600"
              value={caption}
              placeholder="Caption or description..."
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'content-idea-node',
                  props: { caption: e.target.value },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="mb-2 flex-1 cursor-text text-xs text-zinc-400 line-clamp-3 hover:text-zinc-300"
              onClick={(e) => {
                e.stopPropagation()
                this.editor.setEditingShape(shape.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {caption || 'Click to add caption...'}
            </p>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag, i) => (
                <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  #{tag}
                </span>
              ))}
              {hashtags.length > 3 && (
                <span className="text-[10px] text-zinc-500">+{hashtags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            {scheduledDate ? (
              <span className="flex items-center gap-1">
                📅 {formatDate(scheduledDate)}
              </span>
            ) : (
              <span>Not scheduled</span>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: ContentIdeaNodeShape) {
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
  override onResize(shape: ContentIdeaNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: ContentIdeaNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
