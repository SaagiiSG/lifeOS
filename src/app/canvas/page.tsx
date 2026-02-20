'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas } from '@/components/Canvas'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CanvasPage() {
  const router = useRouter()
  const { user, loading, isConfigured } = useAuth()

  useEffect(() => {
    // If auth is configured and user is not logged in, redirect to auth
    if (!loading && isConfigured && !user) {
      router.push('/auth')
    }
  }, [user, loading, isConfigured, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </main>
    )
  }

  // If auth is configured but user is not logged in, don't render canvas
  if (isConfigured && !user) {
    return null
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <Canvas />
    </main>
  )
}
