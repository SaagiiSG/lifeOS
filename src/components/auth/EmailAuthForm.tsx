'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from './AuthProvider'

interface EmailAuthFormProps {
  mode: 'signin' | 'signup'
}

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const router = useRouter()
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password)
        if (error) {
          setError(error.message)
        } else {
          router.push('/canvas')
        }
      } else {
        const { error, needsVerification } = await signUpWithEmail(email, password)
        if (error) {
          setError(error.message)
        } else if (needsVerification) {
          router.push('/auth/verify')
        } else {
          router.push('/canvas')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-zinc-700 bg-zinc-800 focus:border-blue-500"
        />
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="border-zinc-700 bg-zinc-800 focus:border-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isLoading}
      >
        {isLoading
          ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
          : (mode === 'signin' ? 'Sign in' : 'Create account')
        }
      </Button>
    </form>
  )
}
