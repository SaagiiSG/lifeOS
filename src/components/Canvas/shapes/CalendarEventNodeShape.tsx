'use client'

import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
} from 'tldraw'

const calendarEventNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  description: T.string,
  startDate: T.string,
  endDate: T.string,
  startTime: T.string,
  endTime: T.string,
  location: T.string,
  isAllDay: T.boolean,
  isSynced: T.boolean,
  googleEventId: T.string,
  color: T.string,
}

type CalendarEventNodeShapeProps = RecordPropsType<typeof calendarEventNodeShapeProps>

export type CalendarEventNodeShape = TLBaseShape<'calendar-event-node', CalendarEventNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class CalendarEventNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'calendar-event-node' as const
  static override props = calendarEventNodeShapeProps

  getDefaultProps(): CalendarEventNodeShapeProps {
    const today = new Date()
    return {
      w: 260,
      h: 160,
      title: 'New Event',
      description: '',
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      isAllDay: false,
      isSynced: false,
      googleEventId: '',
      color: 'sky',
    }
  }

  getGeometry(shape: CalendarEventNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: CalendarEventNodeShape) {
    const { title, description, startDate, endDate, startTime, endTime, location, isAllDay, isSynced, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; border: string; accent: string }> = {
      sky: { bg: 'bg-sky-950/80', border: 'border-sky-500', accent: 'bg-sky-500' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500', accent: 'bg-blue-500' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500', accent: 'bg-green-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500', accent: 'bg-purple-500' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500', accent: 'bg-orange-500' },
      red: { bg: 'bg-red-950/80', border: 'border-red-500', accent: 'bg-red-500' },
    }

    const colors = colorMap[color] || colorMap.sky

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    const formatTime = (timeStr: string) => {
      if (!timeStr) return ''
      const [hours, minutes] = timeStr.split(':')
      const h = parseInt(hours)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${minutes} ${ampm}`
    }

    const isMultiDay = startDate !== endDate
    const isPast = new Date(startDate) < new Date(new Date().toISOString().split('T')[0])
    const isToday = startDate === new Date().toISOString().split('T')[0]

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} overflow-hidden backdrop-blur-sm transition-all ${
            isPast ? 'opacity-60' : ''
          } ${isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'}`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Color bar */}
          <div className={`h-1.5 w-full ${colors.accent}`} />

          <div className="flex flex-1 flex-col p-3">
            {/* Header */}
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-500"
                    value={title}
                    placeholder="Event title..."
                    autoFocus
                    onChange={(e) => {
                      this.editor.updateShape({
                        id: shape.id,
                        type: 'calendar-event-node',
                        props: { title: e.target.value },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      } as any)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        this.editor.setEditingShape(null)
                      }
                    }}
                    onBlur={() => this.editor.setEditingShape(null)}
                  />
                ) : (
                  <h3
                    className="cursor-text text-sm font-semibold text-white hover:text-zinc-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      this.editor.setEditingShape(shape.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {title || 'Click to add title...'}
                  </h3>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isSynced && (
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-xs" title="Synced with Google Calendar">
                    🔗
                  </span>
                )}
                {isToday && (
                  <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                    Today
                  </span>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="mb-2 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <span>📅</span>
                <span>
                  {formatDate(startDate)}
                  {isMultiDay && ` - ${formatDate(endDate)}`}
                </span>
              </div>
              {!isAllDay && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>🕐</span>
                  <span>
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </span>
                </div>
              )}
              {isAllDay && (
                <span className="text-zinc-400">All day</span>
              )}
            </div>

            {/* Location */}
            {location && (
              <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                <span>📍</span>
                <span className="truncate">{location}</span>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-xs text-zinc-500 line-clamp-2">{description}</p>
            )}

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-500">
              <button
                onClick={() => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'calendar-event-node',
                    props: { isAllDay: !isAllDay },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded bg-zinc-800 px-1.5 py-0.5 hover:bg-zinc-700"
              >
                {isAllDay ? 'All Day' : 'Timed'}
              </button>
              {!isSynced && (
                <span className="text-zinc-600">Not synced</span>
              )}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: CalendarEventNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }

  override canEdit() {
    return true
  }

  override canResize() {
    return true
  }

  override isAspectRatioLocked() {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override onResize(shape: CalendarEventNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: CalendarEventNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
