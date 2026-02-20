'use client'

import { useEditor, createShapeId } from 'tldraw'
import {
    PieChart,
    Settings,
    LogOut,
    User as UserIcon,
    Cloud,
    Loader2,
    HardDrive,
    Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { downloadDataExport } from '@/lib/canvas-storage'

interface BottomLeftSectionProps {
    isSaving: boolean
    lastSavedAt: string | null
    storageType: 'supabase' | 'local'
    shapeCount?: number
    loadFailed?: boolean
}

export function BottomLeftSection({ isSaving, lastSavedAt, storageType, shapeCount, loadFailed }: BottomLeftSectionProps) {
    const editor = useEditor()
    const router = useRouter()
    const { user, signOut } = useAuth()

    const handleCreateAnalyticNode = () => {
        const center = editor.getViewportScreenCenter()
        const point = editor.screenToPage(center)
        const id = createShapeId()

        editor.createShape({
            id,
            type: 'chart-node',
            x: point.x - 160,
            y: point.y - 110,
            props: {
                w: 320,
                h: 220,
                title: 'New Analysis',
                chartType: 'bar',
                data: [
                    { label: 'A', value: 30 },
                    { label: 'B', value: 45 },
                    { label: 'C', value: 60 },
                ],
                color: 'violet',
            },
        } as any)
        editor.select(id)
        editor.setEditingShape(id)
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    const formatTime = (isoString: string) => {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const avatarUrl = user?.user_metadata?.avatar_url

    return (
        <div className="absolute left-6 bottom-6 z-50 flex items-end gap-3 ios-animate-in" style={{ animationDelay: '200ms' }}>
            {/* Button Group */}
            <div className="flex flex-col items-center gap-2 p-1.5 rounded-2xl glass-panel-frost">
                {/* Create Analytic Node - Top */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-xl transition-all duration-300 transform hover:scale-105"
                            onClick={handleCreateAnalyticNode}
                        >
                            <PieChart className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="glass-panel-frost border-white/5 text-zinc-300">
                        <p>Create Analytic Node</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-[1px] w-6 bg-white/[0.06] my-0.5" />

                {/* Profile Button - Bottom */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl hover:bg-white/5 transition-all duration-300 p-0 overflow-hidden ring-2 ring-transparent hover:ring-white/[0.08]"
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-zinc-800/50 text-zinc-500">
                                    <UserIcon className="h-5 w-5" />
                                </div>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" className="w-56 glass-panel-frost border-white/5 text-zinc-400 mb-2 ml-2">
                        <div className="flex items-center gap-2 p-2">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-zinc-200">{displayName}</span>
                                <span className="text-xs text-zinc-600">{user?.email}</span>
                            </div>
                        </div>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuItem className="focus:bg-white/5 focus:text-zinc-200 cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => downloadDataExport()}
                            className="focus:bg-white/5 focus:text-zinc-200 cursor-pointer"
                        >
                            <Download className="mr-2 h-4 w-4" /> Export Data
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleSignOut}
                            className="text-red-400/70 focus:text-red-300 focus:bg-white/5 cursor-pointer"
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Sync Bar - Right of button group */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl glass-panel-frost">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    {loadFailed ? (
                        <>
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-red-400">Load failed - save disabled</span>
                        </>
                    ) : isSaving ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400/70" />
                            <span className="text-zinc-400">Saving...</span>
                        </>
                    ) : lastSavedAt ? (
                        <>
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/60"></span>
                            </div>
                            <span className="text-zinc-400">
                                {storageType === 'supabase' ? 'Synced' : 'Saved'} {formatTime(lastSavedAt)}
                                {shapeCount !== undefined && shapeCount > 0 && ` (${shapeCount})`}
                            </span>
                            {storageType === 'supabase' ? (
                                <Cloud className="h-3 w-3 text-emerald-500/40" />
                            ) : (
                                <HardDrive className="h-3 w-3 text-emerald-500/40" />
                            )}
                        </>
                    ) : (
                        <>
                            <div className="h-2 w-2 rounded-full bg-zinc-700" />
                            <span>Not saved</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
