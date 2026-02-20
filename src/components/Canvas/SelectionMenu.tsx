'use client'

import { useEditor, useValue, createShapeId } from 'tldraw'
import { Layers, Type } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAnimatedUnmount } from '@/hooks/useAnimatedUnmount'
import { cn } from '@/lib/utils'

type SelectionType = 'tasks' | 'text-nodes' | null

export function SelectionMenu() {
    const editor = useEditor()
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

    const { selectedIds, selectionType } = useValue(
        'selected groupable nodes',
        () => {
            const selectedIds = editor.getSelectedShapeIds()
            if (selectedIds.length < 2) return { selectedIds: [] as string[], selectionType: null as SelectionType }

            const shapes = selectedIds.map(id => editor.getShape(id)).filter(Boolean)

            // Check if all selected are task nodes
            const taskShapes = shapes.filter(s => (s as any).type === 'task-node')
            if (taskShapes.length >= 2 && taskShapes.length === shapes.length) {
                return { selectedIds: taskShapes.map(s => s!.id) as string[], selectionType: 'tasks' as SelectionType }
            }

            // Check if all selected are text nodes
            const textShapes = shapes.filter(s => (s as any).type === 'text-node')
            if (textShapes.length >= 2 && textShapes.length === shapes.length) {
                return { selectedIds: textShapes.map(s => s!.id) as string[], selectionType: 'text-nodes' as SelectionType }
            }

            return { selectedIds: [] as string[], selectionType: null as SelectionType }
        },
        [editor]
    )

    useEffect(() => {
        if (selectedIds.length < 2) {
            setPosition(null)
            return
        }

        let minX = Infinity, minY = Infinity

        selectedIds.forEach(id => {
            const bounds = editor.getShapePageBounds(id as any)
            if (bounds) {
                minX = Math.min(minX, bounds.minX)
                minY = Math.min(minY, bounds.minY)
            }
        })

        if (minX === Infinity) return

        const pagePoint = { x: minX, y: minY }
        const screenPoint = editor.pageToViewport(pagePoint)

        setPosition({
            x: screenPoint.x,
            y: screenPoint.y - 50
        })

    }, [editor, selectedIds])

    const handleGroupIntoPhase = () => {
        if (selectedIds.length === 0) return

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

        selectedIds.forEach(id => {
            const bounds = editor.getShapePageBounds(id as any)
            if (!bounds) return
            minX = Math.min(minX, bounds.minX)
            minY = Math.min(minY, bounds.minY)
            maxX = Math.max(maxX, bounds.maxX)
            maxY = Math.max(maxY, bounds.maxY)
        })

        if (minX === Infinity) return

        const padding = 60
        const x = minX - padding
        const y = minY - padding - 40
        const w = (maxX - minX) + (padding * 2)
        const h = (maxY - minY) + (padding * 2) + 40

        const id = createShapeId()

        const existingPhases = editor.getCurrentPageShapes().filter(s => (s as any).type === 'phase-node')
        const nextIndex = existingPhases.length + 1

        editor.createShape({
            id,
            type: 'phase-node',
            x,
            y,
            props: {
                w,
                h,
                title: `Phase ${nextIndex}`,
                phaseIndex: nextIndex,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        editor.sendToBack([id])
        editor.select(id)
    }

    const handleGroupTextNodes = () => {
        if (selectedIds.length === 0) return

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

        selectedIds.forEach(id => {
            const bounds = editor.getShapePageBounds(id as any)
            if (!bounds) return
            minX = Math.min(minX, bounds.minX)
            minY = Math.min(minY, bounds.minY)
            maxX = Math.max(maxX, bounds.maxX)
            maxY = Math.max(maxY, bounds.maxY)
        })

        if (minX === Infinity) return

        const padding = 20
        const x = minX - padding
        const y = minY - padding - 16
        const w = (maxX - minX) + (padding * 2)
        const h = (maxY - minY) + (padding * 2) + 16

        const id = createShapeId()

        editor.createShape({
            id,
            type: 'text-group-node',
            x,
            y,
            props: {
                w,
                h,
                title: 'Note Group',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        editor.sendToBack([id])
        editor.select(id)
    }

    const isVisible = !!position && selectedIds.length >= 2 && !!selectionType
    const { shouldRender, animationState } = useAnimatedUnmount(isVisible)

    if (!shouldRender || !position) return null

    const isEntering = animationState === 'entering' || animationState === 'entered'

    return (
        <div
            className={cn(
                "absolute z-50 flex gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 p-1.5 backdrop-blur-sm shadow-xl",
                isEntering ? 'ios-scale-in' : 'ios-animate-out'
            )}
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(0, -100%)'
            }}
        >
            {selectionType === 'tasks' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleGroupIntoPhase}
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Create Phase
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Group selected tasks into a new phase</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {selectionType === 'text-nodes' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleGroupTextNodes}
                            className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600"
                        >
                            <Type className="h-3.5 w-3.5" />
                            Group Notes
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Group selected text nodes</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}
