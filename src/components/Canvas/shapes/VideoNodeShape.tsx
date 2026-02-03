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
const videoNodeShapeProps = {
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
}

type VideoNodeShapeProps = RecordPropsType<typeof videoNodeShapeProps>

export type VideoNodeShape = TLBaseShape<'video-node', VideoNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class VideoNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'video-node' as const
  static override props = videoNodeShapeProps

  getDefaultProps(): VideoNodeShapeProps {
    return {
      w: 320,
      h: 240,
      title: 'New Video',
      status: 'empty',
      sourceUrl: '',
      outputUrl: '',
      thumbnailUrl: '',
      duration: 0,
      fileSize: 0,
      uploadProgress: 0,
      processingProgress: 0,
      error: '',
    }
  }

  getGeometry(shape: VideoNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: VideoNodeShape) {
    const {
      title,
      status,
      sourceUrl,
      thumbnailUrl,
      duration,
      fileSize,
      uploadProgress,
      processingProgress,
      error,
    } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const formatDuration = (seconds: number) => {
      if (!seconds) return '0:00'
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatFileSize = (bytes: number) => {
      if (!bytes) return '0 MB'
      const mb = bytes / (1024 * 1024)
      return `${mb.toFixed(1)} MB`
    }

    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      empty: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'No Video' },
      uploading: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Uploading' },
      uploaded: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Ready' },
      processing: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Processing' },
      completed: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Complete' },
      failed: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
    }

    const currentStatus = statusConfig[status] || statusConfig.empty

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col overflow-hidden rounded-xl border-2 bg-zinc-900/95 backdrop-blur-sm transition-all ${
            isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-zinc-700'
          }`}
          style={{ pointerEvents: isEditing ? 'all' : 'none' }}
        >
          {/* Video Preview Area */}
          <div className="relative flex-1 bg-black">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : sourceUrl ? (
              <video
                src={sourceUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-zinc-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-xs text-zinc-500">Drop video here</p>
                </div>
              </div>
            )}

            {/* Upload Progress Overlay */}
            {status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="w-3/4">
                  <div className="mb-2 text-center text-sm text-white">
                    Uploading... {uploadProgress}%
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
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
                <div className="w-3/4">
                  <div className="mb-2 text-center text-sm text-white">
                    Processing... {processingProgress}%
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {status === 'failed' && error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
                <div className="p-4 text-center">
                  <svg
                    className="mx-auto h-8 w-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-2 text-xs text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Duration Badge */}
            {duration > 0 && (
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(duration)}
              </div>
            )}
          </div>

          {/* Info Bar */}
          <div className="border-t border-zinc-700 bg-zinc-800/50 p-3">
            <div className="mb-2 flex items-start justify-between">
              {isEditing ? (
                <input
                  className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-zinc-500"
                  value={title}
                  placeholder="Video title..."
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'video-node',
                      props: { title: e.target.value },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="flex-1 truncate text-sm font-medium text-white">
                  {title || 'Untitled Video'}
                </h3>
              )}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${currentStatus.bg} ${currentStatus.color}`}
              >
                {currentStatus.label}
              </span>
            </div>
            {fileSize > 0 && (
              <div className="text-xs text-zinc-500">{formatFileSize(fileSize)}</div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: VideoNodeShape) {
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
  override onResize(shape: VideoNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: VideoNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
