/**
 * Task Storage
 * Persist tasks to Supabase database
 */

import { supabase, isSupabaseConfigured } from './supabase'

export interface TaskRecord {
    id?: string
    shape_id: string
    title: string
    description: string
    completed: boolean
    due_date: string | null
    priority: string
    color: string
    parent_task_shape_id: string | null
    goal_shape_id: string | null
}

/**
 * Save or update task in database
 */
export async function saveTask(task: TaskRecord): Promise<string | null> {
    if (!isSupabaseConfigured()) {
        return null
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('tasks')
            .upsert(
                {
                    shape_id: task.shape_id,
                    title: task.title,
                    description: task.description || '',
                    completed: task.completed || false,
                    due_date: task.due_date || null,
                    priority: task.priority || 'medium',
                    color: task.color || 'blue',
                    parent_task_shape_id: task.parent_task_shape_id || null,
                    goal_shape_id: task.goal_shape_id || null,
                    user_id: null, // Anonymous for now
                },
                {
                    onConflict: 'shape_id',
                }
            )
            .select('id')
            .single()

        if (error) {
            console.error('Failed to save task:', error)
            return null
        }

        return data?.id || null
    } catch (error) {
        console.error('Failed to save task:', error)
        return null
    }
}

/**
 * Get task from database
 */
export async function getTask(shapeId: string): Promise<TaskRecord | null> {
    if (!isSupabaseConfigured()) {
        return null
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('tasks')
            .select('*')
            .eq('shape_id', shapeId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Failed to get task:', error)
            return null
        }

        return data as TaskRecord | null
    } catch (error) {
        console.error('Failed to get task:', error)
        return null
    }
}

/**
 * Update task completion status
 */
export async function updateTaskCompletion(
    shapeId: string,
    completed: boolean
): Promise<void> {
    if (!isSupabaseConfigured()) {
        return
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from('tasks')
            .update({ completed })
            .eq('shape_id', shapeId)
    } catch (error) {
        console.error('Failed to update task completion:', error)
    }
}

/**
 * Delete task from database
 */
export async function deleteTask(shapeId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
        return
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('tasks').delete().eq('shape_id', shapeId)
    } catch (error) {
        console.error('Failed to delete task:', error)
    }
}

/**
 * Get all tasks (optionally filtered by canvas)
 */
export async function getAllTasks(canvasId?: string): Promise<TaskRecord[]> {
    if (!isSupabaseConfigured()) {
        return []
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any).from('tasks').select('*')

        if (canvasId) {
            query = query.eq('canvas_id', canvasId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Failed to get tasks:', error)
            return []
        }

        return (data as TaskRecord[]) || []
    } catch (error) {
        console.error('Failed to get tasks:', error)
        return []
    }
}

/**
 * Export all data (goals, habits, tasks) as a JSON object
 */
export async function exportAllData(): Promise<object | null> {
    if (!isSupabaseConfigured()) {
        return null
    }

    try {
        const [goalsRes, habitsRes, tasksRes, canvasRes] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('goals').select('*'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('habits').select('*'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('tasks').select('*'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any).from('canvas').select('*').limit(1).single(),
        ])

        return {
            exportedAt: new Date().toISOString(),
            goals: goalsRes.data || [],
            habits: habitsRes.data || [],
            tasks: tasksRes.data || [],
            canvas: canvasRes.data || null,
        }
    } catch (error) {
        console.error('Failed to export data:', error)
        return null
    }
}

/**
 * Download data as JSON file
 */
export async function downloadDataExport(): Promise<void> {
    const data = await exportAllData()
    if (!data) {
        console.error('No data to export')
        return
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
}
