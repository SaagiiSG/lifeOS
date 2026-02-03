'use client'

import { useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { Button } from '@/components/ui/button'
import {
  Video,
  Upload,
  Download,
  Play,
  Trash2,
  RefreshCw,
  ExternalLink,
  Film,
} from 'lucide-react'
import type { VideoNodeShape } from './shapes/VideoNodeShape'
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

export function VideoPropertiesPanel() {
  const editor = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  const selectedShape = useValue(
    'selected video node',
    () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length !== 1) return null

      const shape = editor.getShape(selectedIds[0])
      if (!shape || (shape.type as string) !== 'video-node') return null

      return shape as unknown as VideoNodeShape
    },
    [editor]
  )

  if (!selectedShape) return null

  const { status, sourceUrl, outputUrl, duration, fileSize, title } = selectedShape.props

  const updateVideo = (updates: Partial<VideoNodeShape['props']>) => {
    editor.updateShape({
      id: selectedShape.id,
      type: 'video-node',
      props: updates,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      updateVideo({ status: 'failed', error: 'Please select a video file' })
      return
    }

    // Check file size (max 100MB for now)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      updateVideo({ status: 'failed', error: 'File too large (max 100MB)' })
      return
    }

    setIsUploading(true)
    updateVideo({
      status: 'uploading',
      uploadProgress: 0,
      title: title === 'New Video' ? file.name.replace(/\.[^/.]+$/, '') : title,
    })

    try {
      // Get video metadata
      const metadata = await getVideoMetadata(file)
      updateVideo({ duration: metadata.duration })

      // Generate thumbnail
      try {
        const thumbnail = await generateThumbnail(file)
        updateVideo({ thumbnailUrl: thumbnail })
      } catch (e) {
        console.warn('Failed to generate thumbnail:', e)
      }

      // Upload to Supabase
      if (isSupabaseConfigured()) {
        // Simulate progress for now (Supabase SDK doesn't support progress)
        const progressInterval = setInterval(() => {
          const current = selectedShape.props.uploadProgress || 0
          if (current < 90) {
            updateVideo({ uploadProgress: current + 10 })
          }
        }, 200)

        const result = await uploadVideoSimple(file)

        clearInterval(progressInterval)

        const newTitle = title === 'New Video' ? file.name.replace(/\.[^/.]+$/, '') : title
        const thumbnailUrl = selectedShape.props.thumbnailUrl || ''
        const videoDuration = selectedShape.props.duration || 0

        updateVideo({
          status: 'uploaded',
          sourceUrl: result.url,
          fileSize: result.size,
          uploadProgress: 100,
        })

        // Save to video_projects table
        await saveVideoProject({
          shape_id: selectedShape.id,
          title: newTitle,
          status: 'uploaded',
          source_url: result.url,
          output_url: null,
          thumbnail_url: thumbnailUrl,
          duration: videoDuration,
          metadata: {
            fileSize: result.size,
            originalName: file.name,
            mimeType: file.type,
          },
        })
      } else {
        // Fallback to local blob URL
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

  const handleDelete = async () => {
    if (sourceUrl && isSupabaseConfigured()) {
      try {
        // Extract path from URL
        const url = new URL(sourceUrl)
        const path = url.pathname.split('/').slice(-2).join('/')
        await deleteVideo(path)
        // Also delete from database
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
    })
  }

  const handleProcess = async () => {
    // Update status to processing
    updateVideo({ status: 'processing', processingProgress: 0 })

    // Update database status
    if (isSupabaseConfigured()) {
      await updateVideoProjectStatus(selectedShape.id, 'processing')
    }

    // Check if real processor is available
    const processorAvailable = await isProcessorAvailable()

    if (processorAvailable && sourceUrl) {
      // Use real video processor
      try {
        const { job_id } = await startVideoProcessing(sourceUrl, selectedShape.id, {
          whisper_model: 'base',
        })

        // Poll for completion
        await pollProcessingStatus(job_id, (job) => {
          updateVideo({ processingProgress: job.progress })
        })

        // Get final result
        const finalJob = await pollProcessingStatus(job_id)

        if (finalJob.status === 'completed' && finalJob.result?.output_url) {
          updateVideo({
            status: 'completed',
            processingProgress: 100,
            outputUrl: finalJob.result.output_url,
          })

          if (isSupabaseConfigured()) {
            await updateVideoProjectStatus(selectedShape.id, 'completed', {
              output_url: finalJob.result.output_url,
            })
          }
        } else {
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
      // Fallback: Simulate processing for demo
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

          if (isSupabaseConfigured()) {
            await updateVideoProjectStatus(selectedShape.id, 'completed', {
              output_url: sourceUrl,
            })
          }
        } else {
          updateVideo({ processingProgress: Math.min(progress, 99) })
        }
      }, 500)
    }
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

  return (
    <div className="absolute right-4 top-4 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-700 p-3">
        <Film className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Video Project</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-3">
        {/* Upload Button */}
        {status === 'empty' && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
            {!isSupabaseConfigured() && (
              <p className="mt-2 text-xs text-yellow-500">
                Supabase not configured. Videos will only work in this session.
              </p>
            )}
          </div>
        )}

        {/* Video Info */}
        {status !== 'empty' && (
          <>
            {/* Thumbnail/Preview */}
            {(selectedShape.props.thumbnailUrl || sourceUrl) && (
              <div className="mb-4">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                  {showPlayer && sourceUrl ? (
                    <video
                      src={sourceUrl}
                      controls
                      autoPlay
                      className="h-full w-full"
                    />
                  ) : (
                    <>
                      {selectedShape.props.thumbnailUrl ? (
                        <img
                          src={selectedShape.props.thumbnailUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={sourceUrl}
                          className="h-full w-full object-cover"
                          muted
                        />
                      )}
                      {sourceUrl && status !== 'uploading' && status !== 'processing' && (
                        <button
                          onClick={() => setShowPlayer(true)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity hover:bg-black/60"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                            <Play className="h-6 w-6 text-black" fill="black" />
                          </div>
                        </button>
                      )}
                    </>
                  )}
                </div>
                {showPlayer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs"
                    onClick={() => setShowPlayer(false)}
                  >
                    Close Player
                  </Button>
                )}
              </div>
            )}

            {/* Status & Info */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Status</span>
                <span
                  className={`font-medium ${
                    status === 'completed'
                      ? 'text-green-400'
                      : status === 'failed'
                        ? 'text-red-400'
                        : status === 'processing'
                          ? 'text-purple-400'
                          : 'text-yellow-400'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              {duration > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Duration</span>
                  <span className="text-white">{formatDuration(duration)}</span>
                </div>
              )}
              {fileSize > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Size</span>
                  <span className="text-white">{formatFileSize(fileSize)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {status === 'uploaded' && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleProcess}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Process Video
                </Button>
              )}

              {status === 'completed' && outputUrl && (
                <Button
                  className="w-full"
                  onClick={() => window.open(outputUrl, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}

              {sourceUrl && (
                <Button
                  variant="outline"
                  className="w-full border-zinc-700"
                  onClick={() => window.open(sourceUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original
                </Button>
              )}

              {/* Replace Video */}
              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  className="w-full text-zinc-400 hover:text-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || status === 'processing'}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Replace Video
                </Button>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={handleDelete}
                disabled={status === 'uploading' || status === 'processing'}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Video
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
