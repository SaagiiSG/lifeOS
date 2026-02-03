'use client'

interface CheckIn {
  id: string
  date: string
  progress: number
  notes: string
}

interface ProgressChartProps {
  checkIns: CheckIn[]
  currentProgress: number
  color?: string
}

export function ProgressChart({ checkIns, currentProgress, color = 'blue' }: ProgressChartProps) {
  // Sort check-ins by date
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Add current progress as the latest point
  const dataPoints = [
    ...sortedCheckIns.map((c) => ({ date: c.date, progress: c.progress })),
    { date: new Date().toISOString(), progress: currentProgress },
  ]

  if (dataPoints.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 text-xs text-zinc-500">
        Add check-ins to see progress chart
      </div>
    )
  }

  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#8b5cf6',
    orange: '#f97316',
    red: '#ef4444',
    yellow: '#eab308',
  }

  const strokeColor = colorMap[color] || colorMap.blue

  // Calculate SVG path
  const width = 240
  const height = 80
  const padding = { top: 10, right: 10, bottom: 20, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xScale = (index: number) =>
    padding.left + (index / (dataPoints.length - 1)) * chartWidth

  const yScale = (value: number) =>
    padding.top + chartHeight - (value / 100) * chartHeight

  const linePath = dataPoints
    .map((point, i) => {
      const x = xScale(i)
      const y = yScale(point.progress)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const areaPath = `${linePath} L ${xScale(dataPoints.length - 1)} ${
    height - padding.bottom
  } L ${padding.left} ${height - padding.bottom} Z`

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              y1={yScale(value)}
              x2={width - padding.right}
              y2={yScale(value)}
              stroke="#3f3f46"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 5}
              y={yScale(value)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-zinc-500 text-[8px]"
            >
              {value}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={strokeColor} fillOpacity="0.1" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)}
              cy={yScale(point.progress)}
              r="4"
              fill="#0a0a0a"
              stroke={strokeColor}
              strokeWidth="2"
            />
            {/* Show first and last date labels */}
            {(i === 0 || i === dataPoints.length - 1) && (
              <text
                x={xScale(i)}
                y={height - 5}
                textAnchor={i === 0 ? 'start' : 'end'}
                className="fill-zinc-500 text-[8px]"
              >
                {formatDate(point.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
