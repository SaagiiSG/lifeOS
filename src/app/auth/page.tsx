'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/components/auth/AuthProvider'

export default function AuthPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/canvas')
    }
  }, [user, loading, router])

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

  if (user) {
    return null
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <AuthForm />
    </main>
  )
}
