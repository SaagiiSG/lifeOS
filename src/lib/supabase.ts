import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Lazy initialization to avoid build-time errors with invalid URLs
let _supabase: SupabaseClient<Database> | null = null

export const getSupabase = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!_supabase) {
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  return _supabase
}

// Export a proxy object for backwards compatibility
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getSupabase()
    if (!client) {
      // Return a no-op for unconfigured Supabase
      if (prop === 'channel') {
        return () => ({
          on: () => ({ subscribe: () => ({}) }),
        })
      }
      if (prop === 'removeChannel') {
        return () => {}
      }
      return undefined
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop]
  },
})

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your-supabase-url' &&
    supabaseAnonKey !== 'your-supabase-anon-key' &&
    supabaseUrl.startsWith('http')
  )
}
