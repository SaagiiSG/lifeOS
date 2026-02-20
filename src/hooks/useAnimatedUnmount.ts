import { useState, useEffect } from 'react'

export type AnimationState = 'entering' | 'entered' | 'exiting' | 'exited'

/**
 * Keeps a component mounted during its exit animation before unmounting.
 * Returns shouldRender (whether to render the element) and animationState
 * to apply the correct enter/exit CSS animation class.
 */
export function useAnimatedUnmount(isOpen: boolean, exitDurationMs = 200) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animationState, setAnimationState] = useState<AnimationState>(
    isOpen ? 'entered' : 'exited'
  )

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimationState('entering'))
      const timer = setTimeout(() => setAnimationState('entered'), 350)
      return () => clearTimeout(timer)
    } else if (shouldRender) {
      setAnimationState('exiting')
      const timer = setTimeout(() => {
        setAnimationState('exited')
        setShouldRender(false)
      }, exitDurationMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, exitDurationMs, shouldRender])

  return { shouldRender, animationState }
}
