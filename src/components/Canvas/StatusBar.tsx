'use client'

import { useEditor, useValue } from 'tldraw'
import { Cloud, HardDrive, Loader2 } from 'lucide-react'

interface StatusBarProps {
  isSaving: boolean
  lastSavedAt: string | null
  storageType?: 'supabase' | 'local'
}

export function StatusBar({ isSaving, lastSavedAt, storageType = 'local' }: StatusBarProps) {
  const editor = useEditor()

  const zoom = useValue('zoom', () => Math.round(editor.getZoomLevel() * 100), [
    editor,
  ])

  const shapeCount = useValue(
    'shape count',
    () => editor.getCurrentPageShapeIds().size,
    [editor]
  )

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-400 backdrop-blur-sm">
      <span>{zoom}%</span>
      <span className="text-zinc-600">|</span>
      <span>{shapeCount} nodes</span>
      <span className="text-zinc-600">|</span>
      <div className="flex items-center gap-1.5">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
            <span>Saving...</span>
          </>
        ) : lastSavedAt ? (
          <>
            {storageType === 'supabase' ? (
              <Cloud className="h-3 w-3 text-green-500" />
            ) : (
              <HardDrive className="h-3 w-3 text-yellow-500" />
            )}
            <span>
              {storageType === 'supabase' ? 'Synced' : 'Local'} {formatTime(lastSavedAt)}
            </span>
          </>
        ) : (
          <>
            <HardDrive className="h-3 w-3 text-zinc-500" />
            <span>Not saved</span>
          </>
        )}
      </div>
    </div>
  )
}
