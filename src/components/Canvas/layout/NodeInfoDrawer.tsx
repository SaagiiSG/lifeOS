'use client'

import { useMemo } from 'react'
import { useEditor, useValue } from 'tldraw'
import { GoalPropertiesPanel } from '../GoalPropertiesPanel'
import { VideoPropertiesPanel } from '../VideoPropertiesPanel'
import { HabitPropertiesPanel } from '../HabitPropertiesPanel'
import { TaskPropertiesPanel } from '../TaskPropertiesPanel'
import { ConnectionPropertiesPanel } from '../ConnectionPropertiesPanel'
import { GoalEcosystemPropertiesPanel } from '../GoalEcosystemPropertiesPanel'
import { PropertiesPanel } from '../PropertiesPanel'
import { cn } from '@/lib/utils'
import { useAnimatedUnmount } from '@/hooks/useAnimatedUnmount'

const SUPPORTED_TYPES = [
    'goal-node',
    'goal-ecosystem-node',
    'video-node',
    'habit-node',
    'task-node',
    'connection',
    'text-node',
]

export function NodeInfoDrawer() {
    const editor = useEditor()

    const selectedShapeIds = useValue(
        'selected shapes',
        () => editor.getSelectedShapeIds(),
        [editor]
    )

    const shouldShow = useMemo(() => {
        if (selectedShapeIds.length !== 1) return false
        const shape = editor.getShape(selectedShapeIds[0])
        if (!shape) return false
        const type = shape.type as string
        if (type === 'video-editor-node') return false
        return SUPPORTED_TYPES.includes(type)
    }, [selectedShapeIds, editor])

    const { shouldRender, animationState } = useAnimatedUnmount(shouldShow)

    if (!shouldRender) return null

    const isEntering = animationState === 'entering' || animationState === 'entered'

    return (
        <div className={cn(
            "absolute right-6 top-1/2 -translate-y-1/2 z-40",
            "w-80 max-h-[calc(100vh-120px)] overflow-y-auto",
            "bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl",
            "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
            isEntering ? 'ios-slide-in-right' : 'ios-slide-out-right'
        )}>
            <GoalPropertiesPanel />
            <VideoPropertiesPanel />
            <HabitPropertiesPanel />
            <TaskPropertiesPanel />
            <ConnectionPropertiesPanel />
            <GoalEcosystemPropertiesPanel />
            <PropertiesPanel />
        </div>
    )
}
