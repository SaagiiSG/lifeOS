'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hero } from '@/components/landing/Hero'
import { useAuth } from '@/components/auth/AuthProvider'

export default function Home() {
  const router = useRouter()
  const { user, loading, isConfigured } = useAuth()

  useEffect(() => {
    // If user is already logged in, redirect to canvas
    if (!loading && user) {
      router.push('/canvas')
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </main>
    )
  }

  // If user is logged in, don't show landing page (they're being redirected)
  if (user) {
    return null
  }

  // If Supabase isn't configured, redirect to canvas (backwards compatibility)
  if (!isConfigured) {
    router.push('/canvas')
    return null
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <Hero />
    </main>
  )
}
