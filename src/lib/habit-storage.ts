/**
 * Habit Storage
 * Persist habits to Supabase database
 */

import { supabase, isSupabaseConfigured } from './supabase'

export interface HabitCheckIn {
  date: string
  completed: boolean
}

export interface HabitRecord {
  id?: string
  shape_id: string
  name: string
  color: string
  check_ins: HabitCheckIn[]
  current_streak: number
  longest_streak: number
}

/**
 * Calculate streaks from check-ins
 */
export function calculateStreaks(checkIns: HabitCheckIn[]): {
  currentStreak: number
  longestStreak: number
} {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Current streak
  let currentStreak = 0
  const checkDate = new Date(today)
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const hasCheckIn = checkIns.some((c) => c.date === dateStr && c.completed)
    if (hasCheckIn) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (dateStr === todayStr) {
      // Today not checked yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Longest streak
  let longestStreak = 0
  let tempStreak = 0
  const allDates = checkIns
    .filter((c) => c.completed)
    .map((c) => c.date)
    .sort()

  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(allDates[i - 1])
      const curr = new Date(allDates[i])
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      tempStreak = diff === 1 ? tempStreak + 1 : 1
    }
    longestStreak = Math.max(longestStreak, tempStreak)
  }

  return { currentStreak, longestStreak }
}

/**
 * Save or update habit in database
 */
export async function saveHabit(habit: HabitRecord): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { currentStreak, longestStreak } = calculateStreaks(habit.check_ins)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('habits')
      .upsert(
        {
          shape_id: habit.shape_id,
          name: habit.name,
          color: habit.color,
          check_ins: habit.check_ins,
          current_streak: currentStreak,
          longest_streak: Math.max(longestStreak, habit.longest_streak || 0),
          user_id: null, // Anonymous for now
        },
        {
          onConflict: 'shape_id',
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('Failed to save habit:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Failed to save habit:', error)
    return null
  }
}

/**
 * Update habit check-in
 */
export async function updateHabitCheckIn(
  shapeId: string,
  checkIns: HabitCheckIn[]
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    const { currentStreak, longestStreak } = calculateStreaks(checkIns)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('habits')
      .update({
        check_ins: checkIns,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      })
      .eq('shape_id', shapeId)
  } catch (error) {
    console.error('Failed to update habit check-in:', error)
  }
}

/**
 * Get habit from database
 */
export async function getHabit(shapeId: string): Promise<HabitRecord | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('habits')
      .select('*')
      .eq('shape_id', shapeId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get habit:', error)
      return null
    }

    return data as HabitRecord | null
  } catch (error) {
    console.error('Failed to get habit:', error)
    return null
  }
}

/**
 * Delete habit from database
 */
export async function deleteHabit(shapeId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('habits').delete().eq('shape_id', shapeId)
  } catch (error) {
    console.error('Failed to delete habit:', error)
  }
}

/**
 * Get all habits for canvas
 */
export async function getAllHabits(canvasId?: string): Promise<HabitRecord[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('habits').select('*')

    if (canvasId) {
      query = query.eq('canvas_id', canvasId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get habits:', error)
      return []
    }

    return (data as HabitRecord[]) || []
  } catch (error) {
    console.error('Failed to get habits:', error)
    return []
  }
}
