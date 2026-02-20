'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'unknown_error'
  const message = searchParams.get('message') || 'An unexpected error occurred during authentication.'

  const errorMessages: Record<string, string> = {
    access_denied: 'Access was denied. Please try again.',
    exchange_error: 'Failed to complete authentication.',
    unknown_error: 'An unexpected error occurred.',
  }

  const displayMessage = message || errorMessages[error] || errorMessages.unknown_error

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Authentication Error</h1>
          <p className="text-zinc-400">{displayMessage}</p>
        </div>
        <Link href="/auth">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Try again
          </Button>
        </Link>
      </div>
    </main>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </main>
    }>
      <ErrorContent />
    </Suspense>
  )
}
