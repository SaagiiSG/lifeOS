'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoogleAuthButton } from './GoogleAuthButton'
import { EmailAuthForm } from './EmailAuthForm'

export function AuthForm() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Welcome to LifeOS</h1>
        <p className="text-zinc-400">Sign in to access your canvas</p>
      </div>

      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
          <TabsTrigger
            value="signin"
            className="data-[state=active]:bg-zinc-700"
          >
            Sign in
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="data-[state=active]:bg-zinc-700"
          >
            Sign up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="space-y-4 pt-4">
          <GoogleAuthButton />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>
          <EmailAuthForm mode="signin" />
        </TabsContent>

        <TabsContent value="signup" className="space-y-4 pt-4">
          <GoogleAuthButton />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>
          <EmailAuthForm mode="signup" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
