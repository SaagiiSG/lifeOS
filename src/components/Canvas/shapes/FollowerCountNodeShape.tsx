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

const followerCountNodeShapeProps = {
  w: T.number,
  h: T.number,
  platform: T.string, // 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin'
  username: T.string,
  currentCount: T.number,
  previousCount: T.number,
  lastSynced: T.string,
  history: T.arrayOf(
    T.object({
      date: T.string,
      count: T.number,
    })
  ),
  color: T.string,
}

type FollowerCountNodeShapeProps = RecordPropsType<typeof followerCountNodeShapeProps>

export type FollowerCountNodeShape = TLBaseShape<'follower-count-node', FollowerCountNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class FollowerCountNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'follower-count-node' as const
  static override props = followerCountNodeShapeProps

  getDefaultProps(): FollowerCountNodeShapeProps {
    return {
      w: 240,
      h: 180,
      platform: 'instagram',
      username: '',
      currentCount: 0,
      previousCount: 0,
      lastSynced: '',
      history: [],
      color: 'pink',
    }
  }

  getGeometry(shape: FollowerCountNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: FollowerCountNodeShape) {
    const { platform, username, currentCount, previousCount, lastSynced, history, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const colorMap: Record<string, { bg: string; border: string }> = {
      pink: { bg: 'bg-pink-950/80', border: 'border-pink-500' },
      red: { bg: 'bg-red-950/80', border: 'border-red-500' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500' },
      cyan: { bg: 'bg-cyan-950/80', border: 'border-cyan-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500' },
      green: { bg: 'bg-green-950/80', border: 'border-green-500' },
    }

    const platformConfig: Record<string, { icon: string; color: string; gradient: string; name: string }> = {
      instagram: { icon: '📸', color: 'text-pink-400', gradient: 'from-pink-500 to-purple-500', name: 'Instagram' },
      youtube: { icon: '🎬', color: 'text-red-400', gradient: 'from-red-500 to-red-600', name: 'YouTube' },
      tiktok: { icon: '🎵', color: 'text-cyan-400', gradient: 'from-cyan-400 to-pink-500', name: 'TikTok' },
      twitter: { icon: '𝕏', color: 'text-zinc-400', gradient: 'from-zinc-400 to-zinc-600', name: 'X' },
      linkedin: { icon: '💼', color: 'text-blue-400', gradient: 'from-blue-500 to-blue-700', name: 'LinkedIn' },
    }

    const colors = colorMap[color] || colorMap.pink
    const platformInfo = platformConfig[platform] || platformConfig.instagram

    const change = currentCount - previousCount
    const changePercent = previousCount > 0 ? ((change / previousCount) * 100).toFixed(1) : '0'
    const isPositive = change >= 0

    const formatCount = (count: number) => {
      if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M'
      }
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K'
      }
      return count.toLocaleString()
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Never'
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }

    const cyclePlatform = () => {
      const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin']
      const currentIndex = platforms.indexOf(platform)
      const nextPlatform = platforms[(currentIndex + 1) % platforms.length]
      this.editor.updateShape({
        id: shape.id,
        type: 'follower-count-node',
        props: { platform: nextPlatform },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    // Mini chart
    const chartData = history.slice(-7)
    const maxCount = Math.max(...chartData.map((d) => d.count), currentCount, 1)
    const minCount = Math.min(...chartData.map((d) => d.count), currentCount)
    const chartHeight = 40
    const chartWidth = shape.props.w - 40

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} p-3 backdrop-blur-sm transition-all ${
            isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={cyclePlatform}
              onPointerDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1.5 rounded-full bg-gradient-to-r ${platformInfo.gradient} px-2.5 py-1 text-xs font-medium text-white hover:opacity-90`}
            >
              <span>{platformInfo.icon}</span>
              <span>{platformInfo.name}</span>
            </button>
            {username && (
              <span className="text-xs text-zinc-400">@{username}</span>
            )}
          </div>

          {/* Count */}
          <div className="mb-2 text-center">
            <div className="text-3xl font-bold text-white">
              {formatCount(currentCount)}
            </div>
            <div className="text-xs text-zinc-400">followers</div>
          </div>

          {/* Change */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{formatCount(Math.abs(change))}</span>
              <span>({isPositive ? '+' : ''}{changePercent}%)</span>
            </div>
          </div>

          {/* Mini Chart */}
          {chartData.length > 1 && (
            <div className="mb-2">
              <svg width={chartWidth} height={chartHeight} className="mx-auto">
                {chartData.map((d, i) => {
                  const x = (i / (chartData.length - 1)) * (chartWidth - 10) + 5
                  const y = chartHeight - ((d.count - minCount) / (maxCount - minCount || 1)) * (chartHeight - 10) - 5
                  const nextD = chartData[i + 1]

                  return (
                    <g key={i}>
                      {nextD && (
                        <line
                          x1={x}
                          y1={y}
                          x2={(i + 1) / (chartData.length - 1) * (chartWidth - 10) + 5}
                          y2={chartHeight - ((nextD.count - minCount) / (maxCount - minCount || 1)) * (chartHeight - 10) - 5}
                          stroke={isPositive ? '#22c55e' : '#ef4444'}
                          strokeWidth={2}
                        />
                      )}
                      <circle cx={x} cy={y} r={3} fill={isPositive ? '#22c55e' : '#ef4444'} />
                    </g>
                  )
                })}
              </svg>
            </div>
          )}

          {/* Username input when editing */}
          {isEditing && (
            <div className="mb-2">
              <input
                className="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-white outline-none placeholder:text-zinc-500"
                value={username}
                placeholder="Username..."
                onChange={(e) => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'follower-count-node',
                    props: { username: e.target.value },
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
              />
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-500">
            <span>Last sync: {formatDate(lastSynced)}</span>
            <button
              onClick={() => {
                // Simulate sync - in production this would call an API
                const now = new Date().toISOString()
                const newHistory = [...history, { date: now, count: currentCount }].slice(-30)
                this.editor.updateShape({
                  id: shape.id,
                  type: 'follower-count-node',
                  props: {
                    lastSynced: now,
                    previousCount: currentCount,
                    history: newHistory,
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded bg-zinc-800 px-1.5 py-0.5 hover:bg-zinc-700"
            >
              Sync
            </button>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: FollowerCountNodeShape) {
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
  override onResize(shape: FollowerCountNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: FollowerCountNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
