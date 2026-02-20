'use client'

import { useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Film,
  Scissors,
  FileVideo,
  Clock,
  HardDrive,
  Captions,
} from 'lucide-react'
import type { VideoEditorNodeShape } from './shapes/VideoEditorNodeShape'
import {
  uploadVideoSimple,
  getVideoMetadata,
  generateThumbnail,
  deleteVideo,
  saveVideoProject,
  updateVideoProjectStatus,
  deleteVideoProject,
} from '@/lib/video-storage'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  startVideoProcessing,
  pollProcessingStatus,
  isProcessorAvailable,
} from '@/lib/video-processor'
import { VideoEditorModal } from './VideoEditorModal'

export function VideoEditorPropertiesPanel() {
  const editor = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const selectedShape = useValue(
    'selected video editor node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null

      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'video-editor-node') return null

      return shape as unknown as VideoEditorNodeShape
    },
    [editor]
  )

  const isEditorOpen = selectedShape?.props.isEditorOpen || false

  const closeEditor = () => {
    if (selectedShape) {
      editor.updateShape({
        id: selectedShape.id,
        type: 'video-editor-node',
        props: { isEditorOpen: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }
  }

  const closeDialog = () => {
    if (selectedShape) {
      editor.setSelectedShapes([])
    }
  }

  if (!selectedShape) return null

  const {
    status,
    sourceUrl,
    outputUrl,
    duration,
    fileSize,
    title,
    englishCaptionsUrl,
    mongolianCaptionsUrl,
    thumbnailUrl,
  } = selectedShape.props

  const updateVideo = (updates: Partial<VideoEditorNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'video-editor-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      updateVideo({ status: 'failed', error: 'Please select a video file' })
      return
    }

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      updateVideo({ status: 'failed', error: 'File too large (max 100MB)' })
      return
    }

    setIsUploading(true)
    updateVideo({
      status: 'uploading',
      uploadProgress: 0,
      title: title === 'Video Editor' ? file.name.replace(/\.[^/.]+$/, '') : title,
    })

    try {
      const metadata = await getVideoMetadata(file)
      updateVideo({ duration: metadata.duration })

      try {
        const thumbnail = await generateThumbnail(file)
        updateVideo({ thumbnailUrl: thumbnail })
      } catch (e) {
        console.warn('Failed to generate thumbnail:', e)
      }

      if (isSupabaseConfigured()) {
        const progressInterval = setInterval(() => {
          const current = selectedShape.props.uploadProgress || 0
          if (current < 90) {
            updateVideo({ uploadProgress: current + 10 })
          }
        }, 200)

        const result = await uploadVideoSimple(file)
        clearInterval(progressInterval)

        updateVideo({
          status: 'uploaded',
          sourceUrl: result.url,
          fileSize: result.size,
          uploadProgress: 100,
        })

        await saveVideoProject({
          shape_id: selectedShape.id,
          title: selectedShape.props.title || file.name,
          status: 'uploaded',
          source_url: result.url,
          output_url: null,
          thumbnail_url: selectedShape.props.thumbnailUrl || null,
          duration: selectedShape.props.duration || null,
          metadata: {
            fileSize: result.size,
            originalName: file.name,
            mimeType: file.type,
          },
        })
      } else {
        const blobUrl = URL.createObjectURL(file)
        updateVideo({
          status: 'uploaded',
          sourceUrl: blobUrl,
          fileSize: file.size,
          uploadProgress: 100,
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      updateVideo({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleProcess = async () => {
    updateVideo({ status: 'processing', processingProgress: 0 })

    if (isSupabaseConfigured()) {
      await updateVideoProjectStatus(selectedShape.id, 'processing')
    }

    const processorAvailable = await isProcessorAvailable()

    if (processorAvailable && sourceUrl) {
      try {
        const { job_id } = await startVideoProcessing(sourceUrl, selectedShape.id, {
          whisper_model: 'base',
        })

        await pollProcessingStatus(job_id, (job) => {
          updateVideo({ processingProgress: job.progress })
        })

        const finalJob = await pollProcessingStatus(job_id)

        if (finalJob.status === 'completed') {
          const processedUrl = finalJob.result?.output_url || sourceUrl
          const captionUrls = finalJob.result?.captions?.urls || {}

          updateVideo({
            status: 'completed',
            processingProgress: 100,
            outputUrl: processedUrl,
            englishCaptionsUrl: captionUrls.english_srt || '',
            mongolianCaptionsUrl: captionUrls.mongolian_srt || '',
            transcriptUrl: captionUrls.transcript_json || '',
          })

          if (isSupabaseConfigured()) {
            await updateVideoProjectStatus(selectedShape.id, 'completed', {
              output_url: processedUrl,
              metadata: {
                silence_removal: finalJob.result?.silence_removal,
                captions: finalJob.result?.captions,
              },
            })
          }
        } else if (finalJob.status === 'failed') {
          throw new Error(finalJob.message || 'Processing failed')
        }
      } catch (error) {
        console.error('Processing failed:', error)
        updateVideo({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Processing failed',
        })

        if (isSupabaseConfigured()) {
          await updateVideoProjectStatus(selectedShape.id, 'failed')
        }
      }
    } else {
      let progress = 0
      const interval = setInterval(async () => {
        progress += Math.random() * 15
        if (progress >= 100) {
          clearInterval(interval)
          updateVideo({
            status: 'completed',
            processingProgress: 100,
            outputUrl: sourceUrl,
          })
        } else {
          updateVideo({ processingProgress: Math.min(progress, 99) })
        }
      }, 500)
    }
  }

  const handleDelete = async () => {
    if (sourceUrl && isSupabaseConfigured()) {
      try {
        const url = new URL(sourceUrl)
        const path = url.pathname.split('/').slice(-2).join('/')
        await deleteVideo(path)
        await deleteVideoProject(selectedShape.id)
      } catch (e) {
        console.warn('Failed to delete from storage:', e)
      }
    }

    updateVideo({
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
    })
  }

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

  const statusConfig: Record<string, { color: string; label: string }> = {
    empty: { color: 'text-zinc-400', label: 'No Video' },
    uploading: { color: 'text-blue-400', label: 'Uploading' },
    uploaded: { color: 'text-yellow-400', label: 'Ready to Process' },
    processing: { color: 'text-purple-400', label: 'Processing' },
    completed: { color: 'text-green-400', label: 'Complete' },
    failed: { color: 'text-red-400', label: 'Failed' },
  }

  const currentStatus = statusConfig[status] || statusConfig.empty

  return (
    <>
      <Dialog open={!!selectedShape} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent
          className="sm:max-w-2xl border-white/[0.06] bg-transparent p-0 overflow-hidden"
          overlayClassName="bg-black/60 backdrop-blur-sm"
          style={{
            background: 'rgba(20, 20, 22, 0.85)',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.04)',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          <DialogHeader className="border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Film className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {title || 'Video Editor'}
                </DialogTitle>
                <DialogDescription className={`text-sm ${currentStatus.color}`}>
                  {currentStatus.label}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            {/* Empty state - Upload */}
            {status === 'empty' && (
              <div className="flex flex-col items-center py-10">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-500/10">
                  <FileVideo className="h-10 w-10 text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-white">Upload a video</h3>
                <p className="mb-6 text-sm text-zinc-500">
                  Select a video file to get started. Max 100MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  className="bg-purple-600 px-8 hover:bg-purple-500"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Video
                </Button>
              </div>
            )}

            {/* Uploading state */}
            {status === 'uploading' && (
              <div className="flex flex-col items-center py-10">
                <div className="mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-blue-500/10">
                  <Upload className="h-10 w-10 text-blue-400" />
                </div>
                <h3 className="mb-4 text-lg font-medium text-white">
                  Uploading... {selectedShape.props.uploadProgress}%
                </h3>
                <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${selectedShape.props.uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Processing state */}
            {status === 'processing' && (
              <div className="flex flex-col items-center py-10">
                <div className="mb-6 flex h-20 w-20 animate-spin items-center justify-center rounded-2xl bg-purple-500/10" style={{ animationDuration: '3s' }}>
                  <RefreshCw className="h-10 w-10 text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-white">
                  Processing... {Math.round(selectedShape.props.processingProgress)}%
                </h3>
                <p className="mb-4 text-sm text-zinc-500">Removing silence and generating captions</p>
                <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${selectedShape.props.processingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {status === 'failed' && (
              <div className="flex flex-col items-center py-10">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
                  <FileVideo className="h-10 w-10 text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-red-400">Processing Failed</h3>
                <p className="mb-6 text-sm text-zinc-500">
                  {selectedShape.props.error || 'Something went wrong'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  className="bg-purple-600 px-8 hover:bg-purple-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Uploaded / Completed states - show video info + actions */}
            {(status === 'uploaded' || status === 'completed') && (
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Video preview */}
                <div className="overflow-hidden rounded-xl bg-black">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  ) : (sourceUrl || outputUrl) ? (
                    <video
                      src={outputUrl || sourceUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center">
                      <FileVideo className="h-12 w-12 text-zinc-700" />
                    </div>
                  )}
                </div>

                {/* Right: Info + Actions */}
                <div className="flex flex-col justify-between">
                  {/* Video info */}
                  <div className="space-y-3">
                    {duration > 0 && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
                        <Clock className="h-4 w-4 text-zinc-500" />
                        <div>
                          <div className="text-xs text-zinc-500">Duration</div>
                          <div className="text-sm font-medium text-white">{formatDuration(duration)}</div>
                        </div>
                      </div>
                    )}
                    {fileSize > 0 && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
                        <HardDrive className="h-4 w-4 text-zinc-500" />
                        <div>
                          <div className="text-xs text-zinc-500">File Size</div>
                          <div className="text-sm font-medium text-white">{formatFileSize(fileSize)}</div>
                        </div>
                      </div>
                    )}
                    {(englishCaptionsUrl || mongolianCaptionsUrl) && (
                      <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
                        <Captions className="h-4 w-4 text-zinc-500" />
                        <div>
                          <div className="text-xs text-zinc-500">Captions</div>
                          <div className="flex gap-1.5 mt-0.5">
                            {englishCaptionsUrl && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white">EN</span>
                            )}
                            {mongolianCaptionsUrl && (
                              <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs font-medium text-yellow-400">MN</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 space-y-2">
                    {status === 'uploaded' && (
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-500"
                        onClick={handleProcess}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Process Video
                      </Button>
                    )}

                    {status === 'completed' && (
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-500"
                        onClick={() => updateVideo({ isEditorOpen: true })}
                      >
                        <Scissors className="mr-2 h-4 w-4" />
                        Open Editor
                      </Button>
                    )}

                    {outputUrl && status === 'completed' && (
                      <Button
                        variant="outline"
                        className="w-full border-white/[0.06] bg-white/[0.03] text-white hover:bg-white/[0.06]"
                        onClick={() => window.open(outputUrl, '_blank')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {status !== 'empty' && (
            <div className="border-t border-white/[0.06] px-6 py-3">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleDelete}
                  disabled={status === 'uploading' || status === 'processing'}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove Video
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <VideoEditorModal
        isOpen={isEditorOpen}
        onClose={closeEditor}
        videoUrl={outputUrl || sourceUrl}
        englishCaptionsUrl={englishCaptionsUrl}
        mongolianCaptionsUrl={mongolianCaptionsUrl}
        transcriptUrl={selectedShape.props.transcriptUrl}
      />
    </>
  )
}
