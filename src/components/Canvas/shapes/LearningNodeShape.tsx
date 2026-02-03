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

const learningNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  type: T.string, // 'video' | 'article' | 'course' | 'book' | 'podcast'
  url: T.string,
  thumbnailUrl: T.string,
  notes: T.string,
  color: T.string,
}

type LearningNodeShapeProps = RecordPropsType<typeof learningNodeShapeProps>

export type LearningNodeShape = TLBaseShape<'learning-node', LearningNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LearningNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'learning-node' as const
  static override props = learningNodeShapeProps

  getDefaultProps(): LearningNodeShapeProps {
    return {
      w: 280,
      h: 160,
      title: 'New Resource',
      type: 'article',
      url: '',
      thumbnailUrl: '',
      notes: '',
      color: 'cyan',
    }
  }

  getGeometry(shape: LearningNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: LearningNodeShape) {
    const { title, type, url, thumbnailUrl, notes, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; border: string; accent: string }> = {
      cyan: { bg: 'bg-cyan-950/80', border: 'border-cyan-500', accent: 'text-cyan-400' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500', accent: 'text-blue-400' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500', accent: 'text-purple-400' },
      pink: { bg: 'bg-pink-950/80', border: 'border-pink-500', accent: 'text-pink-400' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500', accent: 'text-orange-400' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500', accent: 'text-green-400' },
    }

    const typeIcons: Record<string, string> = {
      video: '🎬',
      article: '📄',
      course: '🎓',
      book: '📚',
      podcast: '🎙️',
    }

    const typeLabels: Record<string, string> = {
      video: 'Video',
      article: 'Article',
      course: 'Course',
      book: 'Book',
      podcast: 'Podcast',
    }

    const colors = colorMap[color] || colorMap.cyan

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

    const getYouTubeThumbnail = (videoUrl: string) => {
      const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
      }
      return ''
    }

    const thumbnail = thumbnailUrl || (isYouTube ? getYouTubeThumbnail(url) : '')

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} overflow-hidden backdrop-blur-sm transition-all ${
            isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Thumbnail */}
          {thumbnail && (
            <div className="relative h-20 w-full shrink-0 bg-zinc-900">
              <img
                src={thumbnail}
                alt={title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              {isYouTube && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white">
                    ▶
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-1 flex-col p-3">
            {/* Header */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-zinc-500"
                    value={title}
                    placeholder="Resource title..."
                    autoFocus
                    onChange={(e) => {
                      this.editor.updateShape({
                        id: shape.id,
                        type: 'learning-node',
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
                    className="cursor-text text-sm font-medium text-white hover:text-zinc-300 line-clamp-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      this.editor.setEditingShape(shape.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {title || 'Click to add title...'}
                  </h3>
                )}
              </div>
              <span className="shrink-0 text-lg" title={typeLabels[type]}>
                {typeIcons[type] || '📄'}
              </span>
            </div>

            {/* URL */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mb-2 text-xs ${colors.accent} hover:underline truncate`}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {new URL(url).hostname}
              </a>
            )}

            {/* Notes */}
            {notes && (
              <p className="text-xs text-zinc-400 line-clamp-2">{notes}</p>
            )}

            {/* Type Badge */}
            <div className="mt-auto flex items-center justify-between">
              <span className={`text-xs font-medium ${colors.accent}`}>
                {typeLabels[type]}
              </span>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  Open →
                </a>
              )}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: LearningNodeShape) {
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
  override onResize(shape: LearningNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: LearningNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
