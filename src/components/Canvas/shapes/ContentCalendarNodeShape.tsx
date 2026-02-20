'use client'

import { useState } from 'react'
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
  TLShapeId,
} from 'tldraw'

const contentCalendarNodeShapeProps = {
  w: T.number,
  h: T.number,
  viewMonth: T.number, // 0-11
  viewYear: T.number,
  entries: T.arrayOf(
    T.object({
      id: T.string,
      date: T.string, // YYYY-MM-DD
      type: T.string, // 'talking-head' | 'broll' | 'creative'
      platform: T.string, // 'instagram' | 'tiktok' | 'youtube'
      title: T.string,
    })
  ),
}

type ContentCalendarNodeShapeProps = RecordPropsType<typeof contentCalendarNodeShapeProps>

export type ContentCalendarNodeShape = TLBaseShape<'content-calendar-node', ContentCalendarNodeShapeProps>

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  instagram: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  tiktok: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  youtube: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  youtube: 'YT',
}

interface LinkedContentIdea {
  nodeId: string
  title: string
  platform: string
  scheduledDate: string
  status: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ContentCalendarNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'content-calendar-node' as const
  static override props = contentCalendarNodeShapeProps

  getDefaultProps(): ContentCalendarNodeShapeProps {
    const now = new Date()
    return {
      w: 620,
      h: 480,
      viewMonth: now.getMonth(),
      viewYear: now.getFullYear(),
      entries: [],
    }
  }

  getGeometry(shape: ContentCalendarNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  // Find content-idea-nodes connected to this calendar via connection shapes
  private getLinkedContentIdeas(shapeId: string): LinkedContentIdea[] {
    const allShapes = this.editor.getCurrentPageShapes()
    const connections = allShapes.filter(
      s => (s.type as string) === 'connection'
    )

    const linkedIds: string[] = []
    for (const conn of connections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = conn.props as any
      if (props.fromId === shapeId && this.isContentIdeaNode(props.toId)) {
        linkedIds.push(props.toId)
      } else if (props.toId === shapeId && this.isContentIdeaNode(props.fromId)) {
        linkedIds.push(props.fromId)
      }
    }

    return linkedIds.map(id => {
      const shape = this.editor.getShape(id as TLShapeId)
      if (!shape) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = shape.props as any
      return {
        nodeId: id,
        title: p.title || 'Untitled',
        platform: p.platform || 'instagram',
        scheduledDate: p.scheduledDate || '',
        status: p.status || 'idea',
      }
    }).filter(Boolean) as LinkedContentIdea[]
  }

  private isContentIdeaNode(id: string): boolean {
    const shape = this.editor.getShape(id as TLShapeId)
    return !!shape && (shape.type as string) === 'content-idea-node'
  }

  component(shape: ContentCalendarNodeShape) {
    const { viewMonth, viewYear, entries } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)

    // Get linked content ideas from connections
    const linkedIdeas = this.getLinkedContentIdeas(shape.id)

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]

    // Calendar grid computation
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const weeks: Array<Array<number | null>> = []
    let currentWeek: Array<number | null> = Array(startDow).fill(null)

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null)
      weeks.push(currentWeek)
    }

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const getDateStr = (day: number) => {
      return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const getEntriesForDay = (day: number) => {
      const dateStr = getDateStr(day)
      return entries.filter(e => e.date === dateStr)
    }

    const getLinkedIdeasForDay = (day: number) => {
      const dateStr = getDateStr(day)
      return linkedIdeas.filter(idea => idea.scheduledDate === dateStr)
    }

    const changeMonth = (offset: number) => {
      let newMonth = viewMonth + offset
      let newYear = viewYear
      if (newMonth < 0) {
        newMonth = 11
        newYear--
      } else if (newMonth > 11) {
        newMonth = 0
        newYear++
      }
      this.editor.updateShape({
        id: shape.id,
        type: 'content-calendar-node',
        props: { viewMonth: newMonth, viewYear: newYear },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const addEntry = (day: number, type: string, platform: string, title: string) => {
      const newEntry = {
        id: `entry-${Date.now()}`,
        date: getDateStr(day),
        type,
        platform,
        title,
      }
      this.editor.updateShape({
        id: shape.id,
        type: 'content-calendar-node',
        props: { entries: [...entries, newEntry] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const removeEntry = (entryId: string) => {
      this.editor.updateShape({
        id: shape.id,
        type: 'content-calendar-node',
        props: { entries: entries.filter(e => e.id !== entryId) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const totalScheduled = entries.length + linkedIdeas.filter(i => i.scheduledDate).length

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-2xl border transition-all ${
            isSelected
              ? 'border-pink-500/60 ring-2 ring-pink-500/20 ring-offset-0'
              : 'border-white/[0.08]'
          }`}
          style={{
            pointerEvents: 'all',
            background: 'rgba(14, 14, 16, 0.7)',
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 50%, rgba(255,255,255,0.015) 100%)',
            boxShadow:
              '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.04)',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(-1)}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                ‹
              </button>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                {monthNames[viewMonth]} {viewYear}
              </h2>
              <button
                onClick={() => changeMonth(1)}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
              >
                ›
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {totalScheduled} scheduled
              </span>
              {linkedIdeas.length > 0 && (
                <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-400">
                  {linkedIdeas.length} linked
                </span>
              )}
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.04] px-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="py-1.5 text-center text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-y-auto px-2 py-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  if (day === null) {
                    return <div key={di} className="min-h-[52px] border-b border-r border-white/[0.02] p-1" />
                  }

                  const dateStr = getDateStr(day)
                  const isToday = dateStr === todayStr
                  const dayEntries = getEntriesForDay(day)
                  const dayLinkedIdeas = getLinkedIdeasForDay(day)

                  return (
                    <DayCell
                      key={di}
                      day={day}
                      isToday={isToday}
                      entries={dayEntries}
                      linkedIdeas={dayLinkedIdeas}
                      onAddEntry={(type, platform, title) => addEntry(day, type, platform, title)}
                      onRemoveEntry={removeEntry}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: ContentCalendarNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
  }

  override canResize() {
    return true
  }

  override isAspectRatioLocked() {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override onResize(shape: ContentCalendarNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }
}

function DayCell({
  day,
  isToday,
  entries,
  linkedIdeas,
  onAddEntry,
  onRemoveEntry,
}: {
  day: number
  isToday: boolean
  entries: Array<{ id: string; type: string; platform: string; title: string }>
  linkedIdeas: LinkedContentIdea[]
  onAddEntry: (type: string, platform: string, title: string) => void
  onRemoveEntry: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('talking-head')
  const [formPlatform, setFormPlatform] = useState('instagram')
  const [formTitle, setFormTitle] = useState('')

  const handleSubmit = () => {
    if (!formTitle.trim()) return
    onAddEntry(formType, formPlatform, formTitle.trim())
    setFormTitle('')
    setShowForm(false)
  }

  return (
    <div
      className={`group relative min-h-[52px] border-b border-r border-white/[0.02] p-1 ${
        isToday ? 'bg-indigo-500/[0.04]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] ${
            isToday ? 'font-bold text-indigo-400' : 'text-zinc-500'
          }`}
        >
          {day}
        </span>
        {/* Always show + on hover (no edit-mode gate) */}
        <button
          onClick={() => setShowForm(!showForm)}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex h-4 w-4 items-center justify-center rounded text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-400"
        >
          +
        </button>
      </div>

      {/* Entry tags (manual) */}
      <div className="mt-0.5 space-y-0.5">
        {entries.map(entry => {
          const pc = PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.instagram
          return (
            <div
              key={entry.id}
              className={`group/entry flex items-center gap-1 rounded px-1 py-0.5 ${pc.bg}`}
            >
              <span className={`text-[8px] font-bold ${pc.text}`}>
                {PLATFORM_LABELS[entry.platform] || entry.platform}
              </span>
              <span className="truncate text-[8px] text-zinc-400">
                {entry.title}
              </span>
              {/* Always show delete on hover (no edit-mode gate) */}
              <button
                onClick={() => onRemoveEntry(entry.id)}
                onPointerDown={(e) => e.stopPropagation()}
                className="ml-auto text-[8px] text-zinc-600 opacity-0 transition-opacity group-hover/entry:opacity-100 hover:text-red-400"
              >
                x
              </button>
            </div>
          )
        })}
        {/* Linked content ideas from connections */}
        {linkedIdeas.map(idea => {
          const pc = PLATFORM_COLORS[idea.platform] || PLATFORM_COLORS.instagram
          return (
            <div
              key={idea.nodeId}
              className={`flex items-center gap-1 rounded px-1 py-0.5 ${pc.bg} border border-violet-500/20`}
            >
              <span className={`text-[8px] font-bold ${pc.text}`}>
                {PLATFORM_LABELS[idea.platform] || idea.platform}
              </span>
              <span className="truncate text-[8px] text-zinc-400">
                {idea.title}
              </span>
              <span className="ml-auto flex-shrink-0 rounded bg-violet-500/10 px-1 text-[7px] text-violet-400">
                linked
              </span>
            </div>
          )
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setShowForm(false)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div
            className="absolute left-0 top-full z-[100] w-48 rounded-lg border border-white/[0.08] p-2 shadow-xl"
            style={{ background: 'rgba(20, 20, 24, 0.95)', backdropFilter: 'blur(12px)' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex gap-1">
              {(['talking-head', 'broll', 'creative'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={`rounded px-1.5 py-0.5 text-[9px] transition-all ${
                    formType === t
                      ? 'bg-white/10 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {t === 'talking-head' ? 'Talking' : t === 'broll' ? 'B-Roll' : 'Creative'}
                </button>
              ))}
            </div>
            <div className="mb-2 flex gap-1">
              {(['instagram', 'tiktok', 'youtube'] as const).map(p => {
                const pc = PLATFORM_COLORS[p]
                return (
                  <button
                    key={p}
                    onClick={() => setFormPlatform(p)}
                    className={`rounded px-1.5 py-0.5 text-[9px] transition-all ${
                      formPlatform === p
                        ? `${pc.bg} ${pc.text}`
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    {PLATFORM_LABELS[p]}
                  </button>
                )
              })}
            </div>
            <input
              className="mb-2 w-full rounded bg-zinc-800/60 px-2 py-1 text-[10px] text-zinc-300 outline-none placeholder:text-zinc-600"
              placeholder="Title..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') handleSubmit()
                if (e.key === 'Escape') setShowForm(false)
              }}
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setShowForm(false)}
                className="rounded px-2 py-0.5 text-[9px] text-zinc-500 hover:text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded bg-indigo-500/20 px-2 py-0.5 text-[9px] text-indigo-400 hover:bg-indigo-500/30"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
