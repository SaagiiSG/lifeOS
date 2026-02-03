'use client'

import { useState, useMemo, useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { Search, X, Type, Target, Flame, CheckSquare, Video, DollarSign, BookOpen, Lightbulb, BarChart3, Calendar, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'

const nodeTypeIcons: Record<string, React.ReactNode> = {
  'text-node': <Type className="h-3 w-3" />,
  'goal-node': <Target className="h-3 w-3" />,
  'habit-node': <Flame className="h-3 w-3" />,
  'task-node': <CheckSquare className="h-3 w-3" />,
  'video-node': <Video className="h-3 w-3" />,
  'budget-node': <DollarSign className="h-3 w-3" />,
  'learning-node': <BookOpen className="h-3 w-3" />,
  'content-idea-node': <Lightbulb className="h-3 w-3" />,
  'chart-node': <BarChart3 className="h-3 w-3" />,
  'calendar-event-node': <Calendar className="h-3 w-3" />,
  'follower-count-node': <Users className="h-3 w-3" />,
}

const nodeTypeLabels: Record<string, string> = {
  'text-node': 'Text',
  'goal-node': 'Goal',
  'habit-node': 'Habit',
  'task-node': 'Task',
  'video-node': 'Video',
  'budget-node': 'Budget',
  'learning-node': 'Learning',
  'content-idea-node': 'Content',
  'chart-node': 'Chart',
  'calendar-event-node': 'Event',
  'follower-count-node': 'Followers',
}

const nodeTypeColors: Record<string, string> = {
  'text-node': 'text-white',
  'goal-node': 'text-blue-400',
  'habit-node': 'text-green-400',
  'task-node': 'text-purple-400',
  'video-node': 'text-pink-400',
  'budget-node': 'text-emerald-400',
  'learning-node': 'text-cyan-400',
  'content-idea-node': 'text-pink-400',
  'chart-node': 'text-violet-400',
  'calendar-event-node': 'text-sky-400',
  'follower-count-node': 'text-rose-400',
}

interface SearchResult {
  id: string
  type: string
  title: string
  preview: string
  x: number
  y: number
}

export function SearchPanel() {
  const editor = useEditor()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const shapes = useValue(
    'all shapes',
    () => editor.getCurrentPageShapes(),
    [editor]
  )

  const searchResults = useMemo(() => {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()

    for (const shape of shapes) {
      const type = shape.type as string
      if (!nodeTypeLabels[type]) continue
      if (typeFilter && type !== typeFilter) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = shape.props as any
      let title = ''
      let preview = ''

      switch (type) {
        case 'text-node':
          title = props.text?.slice(0, 50) || 'Empty text'
          preview = props.text?.slice(0, 100) || ''
          break
        case 'goal-node':
          title = props.title || 'Untitled Goal'
          preview = props.description?.slice(0, 100) || ''
          break
        case 'habit-node':
          title = props.name || 'Untitled Habit'
          preview = `${props.checkIns?.filter((c: { completed: boolean }) => c.completed).length || 0} completions`
          break
        case 'task-node':
          title = props.title || 'Untitled Task'
          preview = props.description?.slice(0, 100) || (props.completed ? 'Completed' : 'Pending')
          break
        case 'video-node':
          title = props.title || 'Untitled Video'
          preview = props.status || 'No video'
          break
        case 'budget-node':
          title = props.title || 'Untitled Transaction'
          preview = `${props.type === 'income' ? '+' : '-'}$${props.amount || 0}`
          break
        case 'learning-node':
          title = props.title || 'Untitled Resource'
          preview = props.type || 'Resource'
          break
        case 'content-idea-node':
          title = props.title || 'Untitled Idea'
          preview = `${props.platform} - ${props.status}`
          break
        case 'chart-node':
          title = props.title || 'Untitled Chart'
          preview = props.chartType || 'Chart'
          break
        case 'calendar-event-node':
          title = props.title || 'Untitled Event'
          preview = props.startDate || 'No date'
          break
        case 'follower-count-node':
          title = props.username || props.platform || 'Follower Count'
          preview = `${props.currentCount?.toLocaleString() || 0} followers`
          break
      }

      // Filter by search query
      if (query && !title.toLowerCase().includes(lowerQuery) && !preview.toLowerCase().includes(lowerQuery)) {
        continue
      }

      results.push({
        id: shape.id,
        type,
        title,
        preview,
        x: shape.x,
        y: shape.y,
      })
    }

    return results.slice(0, 20) // Limit results
  }, [shapes, query, typeFilter])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      editor.select(result.id as any)
      editor.centerOnPoint({ x: result.x, y: result.y }, { animation: { duration: 300 } })
      setIsOpen(false)
      setQuery('')
    },
    [editor]
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/90 text-zinc-400 backdrop-blur-sm transition-colors hover:text-white"
      >
        <Search className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm">
      {/* Search Input */}
      <div className="flex items-center gap-2 border-b border-zinc-700 p-2">
        <Search className="h-4 w-4 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes..."
          className="h-8 flex-1 border-0 bg-transparent p-0 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
          autoFocus
        />
        <button
          onClick={() => {
            setIsOpen(false)
            setQuery('')
            setTypeFilter(null)
          }}
          className="text-zinc-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type Filters */}
      <div className="flex gap-1 border-b border-zinc-700 p-2">
        <button
          onClick={() => setTypeFilter(null)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            typeFilter === null
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          All
        </button>
        {Object.entries(nodeTypeLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? null : type)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
              typeFilter === type
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {nodeTypeIcons[type]}
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="p-4 text-center text-sm text-zinc-500">
            {query ? 'No results found' : 'Start typing to search'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-zinc-800"
              >
                <div className={`mt-0.5 ${nodeTypeColors[result.type]}`}>
                  {nodeTypeIcons[result.type]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium text-white">
                    {result.title}
                  </div>
                  {result.preview && (
                    <div className="truncate text-xs text-zinc-500">{result.preview}</div>
                  )}
                </div>
                <span className="shrink-0 text-[10px] uppercase text-zinc-600">
                  {nodeTypeLabels[result.type]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="border-t border-zinc-700 p-2 text-center text-[10px] text-zinc-600">
        Press <kbd className="rounded bg-zinc-800 px-1">Esc</kbd> to close
      </div>
    </div>
  )
}
