import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

interface UseAutoSaveOptions {
  interval?: number
  onSave?: () => Promise<void>
}

export function useAutoSave({ interval = 500, onSave }: UseAutoSaveOptions = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const nodes = useAppStore((state) => state.nodes)
  const canvas = useAppStore((state) => state.canvas)
  const setSaving = useAppStore((state) => state.setSaving)
  const setLastSaved = useAppStore((state) => state.setLastSaved)

  const save = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (onSave) {
          await onSave()
        }
        setLastSaved(new Date().toISOString())
      } catch (error) {
        console.error('Auto-save failed:', error)
        setSaving(false)
      }
    }, interval)
  }, [interval, onSave, setSaving, setLastSaved])

  // Trigger save when nodes or canvas changes
  useEffect(() => {
    save()
  }, [nodes, canvas, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { save }
}
