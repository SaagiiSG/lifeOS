import { useEffect, useRef } from 'react'
import { Editor, TLShapeId } from 'tldraw'
import { getSupabase } from '@/lib/supabase'

interface TaskSyncData {
    id: string
    shapeId: TLShapeId
    title: string
    description: string
    completed: boolean
    dueDate: string
    priority: string
    color: string
}

export function useTaskSync(editor: Editor | null) {
    const supabase = getSupabase()

    // Keep track of pending updates to debounce them
    const pendingUpdatesRef = useRef<Map<string, TaskSyncData>>(new Map())
    const processingRef = useRef<Set<string>>(new Set())

    // Process updates periodically
    const processUpdates = async () => {
        if (!supabase || pendingUpdatesRef.current.size === 0) return

        const updates = Array.from(pendingUpdatesRef.current.entries())
        // Clear pending updates immediately so new ones can accumulate
        pendingUpdatesRef.current.clear()

        for (const [shapeId, data] of updates) {
            if (processingRef.current.has(shapeId)) continue
            processingRef.current.add(shapeId)

            try {
                // Prepare data for Supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dbData: any = {
                    shape_id: data.shapeId,
                    title: data.title,
                    description: data.description || '',
                    completed: data.completed || false,
                    due_date: data.dueDate || null,
                    priority: data.priority || 'medium',
                    color: data.color || 'blue',
                }

                // Get current user and canvas ID if possible
                const { data: sessionData } = await supabase.auth.getSession()
                const userId = sessionData.session?.user?.id

                // If we have a user, attach it
                if (userId) {
                    dbData.user_id = userId

                    // Try to get canvas ID
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: canvasData } = await (supabase as any)
                        .from('canvas')
                        .select('id')
                        .eq('user_id', userId)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .single()

                    if (canvasData) {
                        dbData.canvas_id = canvasData.id
                    }
                }

                // Upsert to tasks table
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('tasks')
                    .upsert(dbData, { onConflict: 'shape_id' })

                if (error) {
                    console.error('Error syncing task:', error)
                }
            } catch (err) {
                console.error('Exception syncing task:', err)
            } finally {
                processingRef.current.delete(shapeId)
            }
        }
    }

    // Set up store listener
    useEffect(() => {
        if (!editor || !supabase) return

        const unsubscribe = editor.store.listen(
            (entry) => {
                // Only care about task-node changes
                Object.values(entry.changes.added).forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'task-node') {
                        queueUpdate(record as any)
                    }
                })

                Object.values(entry.changes.updated).forEach((change) => {
                    const record = change[1]
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'task-node') {
                        queueUpdate(record as any)
                    }
                })

                // Handle deletions
                Object.values(entry.changes.removed).forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'task-node') {
                        queueDelete(record.id)
                    }
                })
            },
            { source: 'user', scope: 'document' } // Only listen to user changes
        )

        // Helper to queue updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queueUpdate = (shape: any) => {
            const data: TaskSyncData = {
                id: shape.id,
                shapeId: shape.id,
                title: shape.props.title,
                description: shape.props.description,
                completed: shape.props.completed,
                dueDate: shape.props.dueDate,
                priority: shape.props.priority,
                color: shape.props.color,
            }
            pendingUpdatesRef.current.set(shape.id, data)
        }

        // Helper to queue DELETE
        const queueDelete = async (shapeId: string) => {
            // Directly delete from DB
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('tasks')
                    .delete()
                    .eq('shape_id', shapeId)

                if (error) console.error('Error deleting task:', error)
            } catch (err) {
                console.error('Exception deleting task:', err)
            }
        }

        // Use an interval to process the queue
        const intervalId = setInterval(processUpdates, 2000) // Sync every 2s

        return () => {
            unsubscribe()
            clearInterval(intervalId)
        }
    }, [editor, supabase])

    return null
}
