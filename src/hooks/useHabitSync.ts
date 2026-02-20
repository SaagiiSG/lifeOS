import { useEffect, useRef } from 'react'
import { Editor } from 'tldraw'
import { getSupabase } from '@/lib/supabase'

interface HabitSyncData {
    id: string
    dashboardShapeId: string
    name: string
    color: string
    checkIns: Array<{ date: string; completed: boolean }>
}

export function useHabitSync(editor: Editor | null) {
    const supabase = getSupabase()

    // Keep track of pending updates to debounce them
    const pendingUpdatesRef = useRef<Map<string, HabitSyncData[]>>(new Map())
    const processingRef = useRef<Set<string>>(new Set())

    // Process updates periodically
    const processUpdates = async () => {
        if (!supabase || pendingUpdatesRef.current.size === 0) return

        const updates = Array.from(pendingUpdatesRef.current.entries())
        pendingUpdatesRef.current.clear()

        for (const [dashboardId, habits] of updates) {
            if (processingRef.current.has(dashboardId)) continue
            processingRef.current.add(dashboardId)

            try {
                const { data: sessionData } = await supabase.auth.getSession()
                const userId = sessionData.session?.user?.id
                if (!userId) continue

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: canvasData } = await (supabase as any)
                    .from('canvas')
                    .select('id')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single()

                const canvasId = canvasData?.id

                for (const habit of habits) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dbData: any = {
                        shape_id: habit.id,
                        name: habit.name,
                        color: habit.color || 'green',
                        check_ins: habit.checkIns || [],
                        user_id: userId,
                    }
                    if (canvasId) dbData.canvas_id = canvasId

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error } = await (supabase as any)
                        .from('habits')
                        .upsert(dbData, { onConflict: 'shape_id' })

                    if (error) {
                        console.error('Error syncing habit:', error)
                    }
                }
            } catch (err) {
                console.error('Exception syncing habits:', err)
            } finally {
                processingRef.current.delete(dashboardId)
            }
        }
    }

    // Set up store listener
    useEffect(() => {
        if (!editor || !supabase) return

        const queueDashboardSync = (shape: { id: string; props: { habits?: Array<{ id: string; name: string; color: string; checkIns: Array<{ date: string; completed: boolean }> }> } }) => {
            const habits = shape.props.habits || []
            const syncData: HabitSyncData[] = habits.map(h => ({
                id: h.id,
                dashboardShapeId: shape.id,
                name: h.name,
                color: h.color,
                checkIns: h.checkIns || [],
            }))
            pendingUpdatesRef.current.set(shape.id, syncData)
        }

        const unsubscribe = editor.store.listen(
            (entry) => {
                Object.values(entry.changes.added).forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'habit-dashboard-node') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        queueDashboardSync(record as any)
                    }
                })

                Object.values(entry.changes.updated).forEach((change) => {
                    const record = change[1]
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (record.typeName === 'shape' && (record as any).type === 'habit-dashboard-node') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        queueDashboardSync(record as any)
                    }
                })
            },
            { source: 'user', scope: 'document' }
        )

        const intervalId = setInterval(processUpdates, 2000)

        return () => {
            unsubscribe()
            clearInterval(intervalId)
        }
    }, [editor, supabase])

    return null
}
