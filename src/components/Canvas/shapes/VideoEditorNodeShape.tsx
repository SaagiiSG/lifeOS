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
const videoEditorNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  status: T.string,
  sourceUrl: T.string,
  outputUrl: T.string,
  thumbnailUrl: T.string,
  duration: T.number,
  fileSize: T.number,
  uploadProgress: T.number,
  processingProgress: T.number,
  error: T.string,
  // Caption URLs
  englishCaptionsUrl: T.string,
  mongolianCaptionsUrl: T.string,
  transcriptUrl: T.string,
  // Editor state
  isEditorOpen: T.boolean,
}

type VideoEditorNodeShapeProps = RecordPropsType<typeof videoEditorNodeShapeProps>

export type VideoEditorNodeShape = TLBaseShape<'video-editor-node', VideoEditorNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class VideoEditorNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'video-editor-node' as const
  static override props = videoEditorNodeShapeProps

  getDefaultProps(): VideoEditorNodeShapeProps {
    return {
      w: 360,
      h: 640,
      title: 'Video Editor',
      status: 'empty',
      sourceUrl: '',
      outputUrl: '',
      thumbnailUrl: '',
      duration: 0,
      fileSize: 0,
      uploadProgress: 0,
      processingProgress: 0,
      error: '',
      englishCaptionsUrl: '',
      mongolianCaptionsUrl: '',
      transcriptUrl: '',
      isEditorOpen: false,
    }
  }

  getGeometry(shape: VideoEditorNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: VideoEditorNodeShape) {
    const {
      title,
      status,
      sourceUrl,
      outputUrl,
      thumbnailUrl,
      duration,
      uploadProgress,
      processingProgress,
      error,
      englishCaptionsUrl,
      mongolianCaptionsUrl,
    } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)

    const formatDuration = (seconds: number) => {
      if (!seconds) return '0:00'
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
      empty: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'Drop Video', icon: '🎬' },
      uploading: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Uploading', icon: '⬆️' },
      uploaded: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Ready to Process', icon: '✨' },
      processing: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Processing', icon: '⚙️' },
      completed: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Ready to Edit', icon: '✅' },
      failed: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed', icon: '❌' },
    }

    const currentStatus = statusConfig[status] || statusConfig.empty
    const hasCaptions = !!(englishCaptionsUrl || mongolianCaptionsUrl)

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`glass-panel-frost ios-scale-in flex h-full w-full flex-col overflow-hidden rounded-2xl transition-all ${
            isSelected ? 'border-purple-500/60 ring-4 ring-purple-500/20 ring-offset-0' : 'border-white/[0.06]'
          }`}
          style={{
            pointerEvents: 'all',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎬</span>
              <h3 className="font-semibold text-white">{title || 'Video Editor'}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${currentStatus.bg} ${currentStatus.color}`}>
              {currentStatus.icon} {currentStatus.label}
            </span>
          </div>

          {/* Video Preview Area */}
          <div className="relative flex-1 bg-black">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : sourceUrl || outputUrl ? (
              <video
                src={outputUrl || sourceUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl">🎥</div>
                  <p className="mt-4 text-lg text-zinc-400">Drop video here</p>
                  <p className="mt-1 text-sm text-zinc-600">or double-click to upload</p>
                </div>
              </div>
            )}

            {/* Upload Progress Overlay */}
            {status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="w-3/4 text-center">
                  <div className="text-4xl">⬆️</div>
                  <div className="mt-4 text-lg text-white">Uploading... {uploadProgress}%</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Processing Progress Overlay */}
            {status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="w-3/4 text-center">
                  <div className="animate-spin text-4xl">⚙️</div>
                  <div className="mt-4 text-lg text-white">Processing... {processingProgress}%</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">Removing silence & generating captions</p>
                </div>
              </div>
            )}

            {/* Ready to Edit Overlay */}
            {status === 'completed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity hover:opacity-100">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-600">
                    <span className="text-3xl">✏️</span>
                  </div>
                  <p className="mt-4 text-lg font-medium text-white">Double-click to Edit</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {status === 'failed' && error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
                <div className="p-6 text-center">
                  <div className="text-4xl">❌</div>
                  <p className="mt-4 text-lg text-white">Processing Failed</p>
                  <p className="mt-2 text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Duration Badge */}
            {duration > 0 && (
              <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-sm text-white">
                {formatDuration(duration)}
              </div>
            )}

            {/* Caption Badges */}
            {hasCaptions && (
              <div className="absolute bottom-3 left-3 flex gap-1">
                {englishCaptionsUrl && (
                  <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-medium text-white">EN</span>
                )}
                {mongolianCaptionsUrl && (
                  <span className="rounded bg-yellow-500/30 px-2 py-0.5 text-xs font-medium text-yellow-400">MN</span>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                {status === 'completed' ? (
                  <span className="text-green-400">Ready to edit</span>
                ) : status === 'uploaded' ? (
                  <span>Click Process to start</span>
                ) : status === 'empty' ? (
                  <span>Upload a video to begin</span>
                ) : (
                  <span>{currentStatus.label}...</span>
                )}
              </div>
              {status === 'completed' && (
                <div className="flex items-center gap-1 text-purple-400">
                  <span className="text-xs">Double-click to edit</span>
                  <span>→</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: VideoEditorNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
  }

  override canEdit() {
    return true
  }

  override canResize() {
    return true
  }

  override isAspectRatioLocked() {
    return true  // Lock to 9:16 ratio
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override onResize(shape: VideoEditorNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: VideoEditorNodeShape) {
    // Open editor modal - this will be handled by the parent component
    if (shape.props.status === 'completed') {
      this.editor.updateShape({
        id: shape.id,
        type: 'video-editor-node',
        props: { isEditorOpen: true },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    } else if (shape.props.status === 'empty') {
      // Trigger file upload
      this.editor.setEditingShape(shape.id)
    }
  }
}
