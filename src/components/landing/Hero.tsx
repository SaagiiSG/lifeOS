'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Target, Video, Flame, CheckSquare, BarChart3 } from 'lucide-react'

const features = [
  { icon: Target, label: 'Goals', color: 'text-blue-500' },
  { icon: CheckSquare, label: 'Tasks', color: 'text-green-500' },
  { icon: Flame, label: 'Habits', color: 'text-orange-500' },
  { icon: Video, label: 'Videos', color: 'text-purple-500' },
  { icon: BarChart3, label: 'Analytics', color: 'text-cyan-500' },
]

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-3xl space-y-8 text-center">
        <h1
          className="ios-slide-in-up text-5xl font-bold tracking-tight sm:text-6xl"
          style={{ animationDelay: '100ms' }}
        >
          Your life, visualized on an{' '}
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            infinite canvas
          </span>
        </h1>
        <p
          className="ios-slide-in-up mx-auto max-w-xl text-lg text-zinc-400"
          style={{ animationDelay: '250ms' }}
        >
          LifeOS is your personal productivity workspace. Track goals, manage tasks,
          build habits, and see how everything connects on a beautiful infinite canvas.
        </p>
        <div
          className="ios-scale-in flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: '400ms' }}
        >
          <Link href="/auth">
            <Button size="lg" className="bg-blue-600 px-8 hover:bg-blue-700">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-5 stagger-children" style={{ '--base-delay': '500ms' } as React.CSSProperties}>
          {features.map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-300 [transition-timing-function:var(--ease-spring)] hover:scale-105 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
            >
              <feature.icon className={`h-8 w-8 ${feature.color}`} />
              <span className="text-sm text-zinc-400">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
