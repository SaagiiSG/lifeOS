'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-zinc-400">
            We sent you a verification link. Click the link in your email to verify your account and sign in.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </p>
          <Link href="/auth">
            <Button variant="outline" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
