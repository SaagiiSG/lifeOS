'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Timer } from 'lucide-react'
import { savePomodoroSession, getTodaySessions } from '@/lib/pomodoro-storage'

type TimerMode = 'deep-work' | 'hormozi-sprint'
type TimerPhase = 'work' | 'break' | 'idle'

const DEEP_WORK_MINUTES = 40
const DEEP_WORK_BREAK_MINUTES = 5
const HORMOZI_SPRINT_MINUTES = 15

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio not available
  }
}

export function PomodoroTimer() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mode, setMode] = useState<TimerMode>('deep-work')
  const [phase, setPhase] = useState<TimerPhase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(DEEP_WORK_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [showSentenceDialog, setShowSentenceDialog] = useState(false)
  const [sentence, setSentence] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load today's session count on mount
  useEffect(() => {
    setSessionCount(getTodaySessions().length)
  }, [])

  const getWorkDuration = useCallback(() => {
    return mode === 'deep-work' ? DEEP_WORK_MINUTES * 60 : HORMOZI_SPRINT_MINUTES * 60
  }, [mode])

  const getBreakDuration = useCallback(() => {
    return DEEP_WORK_BREAK_MINUTES * 60
  }, [])

  const handleTimerEnd = useCallback(() => {
    playBeep()
    setIsRunning(false)

    if (mode === 'hormozi-sprint') {
      // Show sentence dialog
      setShowSentenceDialog(true)
    } else {
      // Deep work: toggle between work and break
      if (phase === 'work') {
        savePomodoroSession({
          timestamp: new Date().toISOString(),
          mode,
          duration: DEEP_WORK_MINUTES * 60,
          sentence: '',
        })
        setSessionCount(prev => prev + 1)
        setPhase('break')
        setSecondsLeft(getBreakDuration())
        setIsRunning(true)
      } else {
        setPhase('idle')
        setSecondsLeft(getWorkDuration())
      }
    }
  }, [mode, phase, getWorkDuration, getBreakDuration])

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            // Use setTimeout to avoid state update during render
            setTimeout(() => handleTimerEnd(), 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, secondsLeft, handleTimerEnd])

  const handleStart = () => {
    if (phase === 'idle') {
      setPhase('work')
      setSecondsLeft(getWorkDuration())
    }
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(getWorkDuration())
  }

  const handleModeSwitch = (newMode: TimerMode) => {
    setIsRunning(false)
    setPhase('idle')
    setMode(newMode)
    setSecondsLeft(newMode === 'deep-work' ? DEEP_WORK_MINUTES * 60 : HORMOZI_SPRINT_MINUTES * 60)
  }

  const handleSentenceSubmit = () => {
    savePomodoroSession({
      timestamp: new Date().toISOString(),
      mode: 'hormozi-sprint',
      duration: HORMOZI_SPRINT_MINUTES * 60,
      sentence,
    })
    setSessionCount(prev => prev + 1)
    setSentence('')
    setShowSentenceDialog(false)
    // Start next sprint
    setPhase('work')
    setSecondsLeft(HORMOZI_SPRINT_MINUTES * 60)
    setIsRunning(true)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const totalDuration = phase === 'break' ? getBreakDuration() : getWorkDuration()
  const progress = totalDuration > 0 ? ((totalDuration - secondsLeft) / totalDuration) * 100 : 0

  // Collapsed: just a small floating pill
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-white/[0.06] px-3 py-2 transition-all hover:border-white/[0.1]"
        style={{
          background: 'rgba(14, 14, 16, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Timer className="h-4 w-4 text-zinc-500" />
        {isRunning && (
          <span className="text-xs font-mono text-zinc-300">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        )}
        {!isRunning && phase === 'idle' && (
          <span className="text-xs text-zinc-500">Timer</span>
        )}
        {sessionCount > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500/20 px-1 text-[9px] font-medium text-indigo-400">
            {sessionCount}
          </span>
        )}
        <ChevronUp className="h-3 w-3 text-zinc-600" />
      </button>
    )
  }

  return (
    <>
      <div
        className="absolute bottom-6 right-6 z-50 flex w-[220px] flex-col rounded-2xl border border-white/[0.06]"
        style={{
          background: 'rgba(14, 14, 16, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {phase === 'break' ? 'Break' : mode === 'deep-work' ? 'Deep Work' : 'Sprint'}
          </span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="flex flex-col items-center px-4 py-5">
          {/* Circular progress */}
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={phase === 'break' ? '#22c55e' : '#6366f1'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="font-mono text-2xl font-light text-white">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-2">
            {!isRunning ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300"
                onClick={handleStart}
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-300"
                onClick={handlePause}
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="border-t border-white/[0.04] px-3 py-2">
          <div className="flex rounded-lg bg-white/[0.03] p-0.5">
            <button
              onClick={() => handleModeSwitch('deep-work')}
              className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                mode === 'deep-work'
                  ? 'bg-white/[0.06] text-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              Deep Work
            </button>
            <button
              onClick={() => handleModeSwitch('hormozi-sprint')}
              className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                mode === 'hormozi-sprint'
                  ? 'bg-white/[0.06] text-zinc-300'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              Sprint
            </button>
          </div>
        </div>

        {/* Session Count */}
        <div className="border-t border-white/[0.04] px-4 py-2 text-center">
          <span className="text-[10px] text-zinc-600">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} today
          </span>
        </div>
      </div>

      {/* Hormozi Sprint completion dialog */}
      <Dialog open={showSentenceDialog} onOpenChange={setShowSentenceDialog}>
        <DialogContent className="border-white/[0.06] bg-zinc-950 text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">Sprint Complete</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3 text-sm text-zinc-400">What did you accomplish?</p>
            <Input
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="One sentence..."
              className="border-zinc-700 bg-zinc-900 text-zinc-200 placeholder:text-zinc-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sentence.trim()) {
                  handleSentenceSubmit()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleSentenceSubmit}
              disabled={!sentence.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Submit & Next Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
