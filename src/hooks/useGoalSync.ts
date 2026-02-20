import { useEffect, useRef } from 'react'
import { Editor, TLShapeId } from 'tldraw'
import { getSupabase } from '@/lib/supabase'
import { useDebounce } from '@/hooks/useDebounce'

interface GoalSyncData {
    id: string
    shapeId: TLShapeId
    title: string
    description: string
    targetDate: string
    progress: number
    status: string
    quarter: string
    rolledOverFrom: string
    color: string
    milestones: any[]
    checkIns: any[]
}

export function useGoalSync(editor: Editor | null) {
    const supabase = getSupabase()

    // Keep track of pending updates to debounce them
    const pendingUpdatesRef = useRef<Map<string, GoalSyncData>>(new Map())
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
                    description: data.description || null,
                    target_date: data.targetDate || null,
                    progress: data.progress || 0,
                    status: data.status || 'active',
                    quarter: data.quarter || null,
                    rolled_over_from: data.rolledOverFrom || null,
                    color: data.color || 'blue',
                    milestones: data.milestones || [],
                    check_ins: data.checkIns || [],
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

                // Upsert to goals table
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (supabase as any)
                    .from('goals')
                    .upsert(dbData, { onConflict: 'shape_id' })

                if (error) {
                    console.error('Error syncing goal:', error)
                    // Re-queue update? Currently just logging error
                }
            } catch (err) {
                console.error('Exception syncing goal:', err)
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
                // Only care about goal-node changes
                Object.values(entry.changes.added).forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'goal-node') {
                        queueUpdate(record as any)
                    }
                })

                Object.values(entry.changes.updated).forEach((change) => {
                    const record = change[1]
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'goal-node') {
                        queueUpdate(record as any)
                    }
                })

                // Handle deletions
                Object.values(entry.changes.removed).forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'goal-node') {
                        queueDelete(record.id)
                    }
                })
            },
            { source: 'user', scope: 'document' } // Only listen to user changes
        )

        // Helper to queue updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queueUpdate = (shape: any) => {
            const data: GoalSyncData = {
                id: shape.id,
                shapeId: shape.id,
                title: shape.props.title,
                description: shape.props.description,
                targetDate: shape.props.targetDate,
                progress: shape.props.progress,
                status: shape.props.status,
                quarter: shape.props.quarter,
                rolledOverFrom: shape.props.rolledOverFrom,
                color: shape.props.color,
                milestones: shape.props.milestones,
                checkIns: shape.props.checkIns,
            }
            pendingUpdatesRef.current.set(shape.id, data)
        }

        // Helper to queue DELETE
        const queueDelete = async (shapeId: string) => {
            // Directly delete from DB
            try {
                const { error } = await supabase
                    .from('goals')
                    .delete()
                    .eq('shape_id', shapeId)

                if (error) console.error('Error deleting goal:', error)
            } catch (err) {
                console.error('Exception deleting goal:', err)
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
