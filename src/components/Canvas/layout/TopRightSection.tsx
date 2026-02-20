'use client'

import { useEditor, useValue } from 'tldraw'
import {
    Search,
    Download,
    Eye,
    Trash2,
    Copy,
    Palette,
    Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAnimatedUnmount } from '@/hooks/useAnimatedUnmount'
import { cn } from '@/lib/utils'

interface TopRightSectionProps {
    onSearchClick: () => void
}

export function TopRightSection({ onSearchClick }: TopRightSectionProps) {
    const editor = useEditor()

    const selectedShapeIds = useValue(
        'selected shapes',
        () => editor.getSelectedShapeIds(),
        [editor]
    )

    const hasSelection = selectedShapeIds.length > 0
    const isSingleSelection = selectedShapeIds.length === 1
    const { shouldRender: shouldRenderContextBar, animationState: contextBarState } = useAnimatedUnmount(hasSelection)

    const handleDelete = () => {
        editor.deleteShapes(Array.from(selectedShapeIds))
    }

    const handleDuplicate = () => {
        editor.duplicateShapes(Array.from(selectedShapeIds))
    }

    const handleZoomToFit = () => {
        editor.zoomToFit({ animation: { duration: 200 } })
    }

    const handleExport = () => {
        // Placeholder for export logic
        console.log('Exporting...')
    }

    return (
        <div className="absolute right-6 top-6 z-50 flex items-start gap-4 pointer-events-none">
            <div className="flex flex-col gap-2 pointer-events-auto">

                {/* Top Row: Search & compact actions */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
                                onClick={onSearchClick}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Search</TooltipContent>
                    </Tooltip>

                    {/* View Options */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 px-3 gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                <span className="text-xs font-medium">View</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={handleZoomToFit}>Zoom to Fit</DropdownMenuItem>
                            <DropdownMenuItem>Show Grid</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Export/Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 px-3 gap-2"
                            >
                                <Download className="h-4 w-4" />
                                <span className="text-xs font-medium">Export</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem onClick={handleExport}>Save as PNG</DropdownMenuItem>
                            <DropdownMenuItem>Save as JSON</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Second Row: Context Aware Actions (Only visible when selected) */}
                {shouldRenderContextBar && (
                    <div className={cn(
                        "flex items-center gap-1 p-1 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-xl",
                        contextBarState === 'entering' || contextBarState === 'entered'
                            ? 'ios-animate-in'
                            : 'ios-animate-out'
                    )}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => {/* Open color picker logic */ }}
                                >
                                    <Palette className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Color</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                                    onClick={handleDuplicate}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => {
                                        const ids = Array.from(selectedShapeIds)
                                        // Skip tldraw's built-in grouping for text nodes —
                                        // the SelectionMenu handles custom grouping for those
                                        const shapes = ids.map(id => editor.getShape(id)).filter(Boolean)
                                        const allText = shapes.every(s => (s as any).type === 'text-node')
                                        if (!allText) {
                                            editor.groupShapes(ids)
                                        }
                                    }}
                                >
                                    <Layers className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Group</TooltipContent>
                        </Tooltip>

                        <div className="w-[1px] h-4 bg-white/10 mx-1" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
    )
}
