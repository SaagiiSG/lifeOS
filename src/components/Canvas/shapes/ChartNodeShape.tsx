'use client'

import { useMemo } from 'react'
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  T,
  RecordPropsType,
  Rectangle2d,
  resizeBox,
} from 'tldraw'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const chartNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  chartType: T.string, // 'line' | 'bar' | 'pie' | 'area'
  viewMode: T.string, // 'overall' | 'individual'
  data: T.arrayOf(
    T.object({
      label: T.string,
      value: T.number,
    })
  ),
  color: T.string,
}

type ChartNodeShapeProps = RecordPropsType<typeof chartNodeShapeProps>

export type ChartNodeShape = TLBaseShape<'chart-node', ChartNodeShapeProps>

// Habit color to hex mapping
const habitColorToHex: Record<string, string> = {
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  pink: '#ec4899',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
}

// Default colors for cycling when habits have no color
const defaultColors = [
  '#8b5cf6',
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#eab308',
]

interface ConnectedHabit {
  id: string
  name: string
  color?: string
  checkIns: Array<{ date: string; completed: boolean }>
}

interface ConnectedGoal {
  id: string
  title: string
}

interface ConnectedTask {
  id: string
  title: string
  completed: boolean
}

interface ConnectedBudget {
  id: string
  monthlySalary: number
  expenses: Array<{
    id: string
    amount: number
    category: string
    description: string
    date: string
  }>
}

// Budget category colors
const budgetCategoryColors: Record<string, { color: string; label: string }> = {
  food: { color: '#f97316', label: 'Food' },
  transport: { color: '#3b82f6', label: 'Transport' },
  entertainment: { color: '#a855f7', label: 'Entertainment' },
  shopping: { color: '#ec4899', label: 'Shopping' },
  bills: { color: '#ef4444', label: 'Bills' },
  health: { color: '#22c55e', label: 'Health' },
  other: { color: '#71717a', label: 'Other' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataItem = Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ChartNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'chart-node' as const
  static override props = chartNodeShapeProps

  getDefaultProps(): ChartNodeShapeProps {
    return {
      w: 320,
      h: 220,
      title: 'New Chart',
      chartType: 'bar',
      viewMode: 'overall',
      data: [
        { label: 'Mon', value: 30 },
        { label: 'Tue', value: 45 },
        { label: 'Wed', value: 60 },
        { label: 'Thu', value: 35 },
        { label: 'Fri', value: 80 },
        { label: 'Sat', value: 55 },
        { label: 'Sun', value: 40 },
      ],
      color: 'violet',
    }
  }

  getGeometry(shape: ChartNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: ChartNodeShape) {
    const { title, chartType, viewMode, data, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    // Calculate how many data points fit based on width
    // Reserve ~60px for y-axis labels + padding, each data point needs ~35px min
    const minPointWidth = 35
    const reservedWidth = 60
    const availableChartWidth = shape.props.w - reservedWidth
    const numDays = Math.min(90, Math.max(7, Math.floor(availableChartWidth / minPointWidth)))
    const numMonths = Math.min(24, Math.max(3, Math.floor(availableChartWidth / 50)))
    // Show every Nth label to avoid overlap (aim for ~8 visible labels max)
    const tickInterval = numDays <= 10 ? 0 : Math.floor(numDays / 8)

    // Find connected nodes
    const allShapes = this.editor.getCurrentPageShapes()
    const connections = allShapes.filter((s) => (s.type as string) === 'connection')

    // Find what's connected to this chart
    const connectedHabits: ConnectedHabit[] = []
    const connectedGoals: ConnectedGoal[] = []
    const connectedTasks: ConnectedTask[] = []
    const connectedBudgets: ConnectedBudget[] = []

    for (const conn of connections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connProps = conn.props as any
      if (connProps.fromId === shape.id || connProps.toId === shape.id) {
        const otherId = connProps.fromId === shape.id ? connProps.toId : connProps.fromId
        const otherShape = this.editor.getShape(otherId)

        if (otherShape) {
          const type = otherShape.type as string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const props = otherShape.props as any

          if (type === 'habit-node') {
            connectedHabits.push({
              id: otherId,
              name: props.name || 'Unnamed Habit',
              color: props.color,
              checkIns: props.checkIns || [],
            })
          } else if (type === 'habit-dashboard-node') {
            // Dashboard stores habits internally in its props
            const dashboardHabits = props.habits || []
            for (const h of dashboardHabits) {
              if (!connectedHabits.find(ch => ch.id === h.id)) {
                connectedHabits.push({
                  id: h.id,
                  name: h.name || 'Unnamed Habit',
                  color: h.color,
                  checkIns: h.checkIns || [],
                })
              }
            }
          } else if (type === 'goal-node') {
            connectedGoals.push({
              id: otherId,
              title: props.title || 'Unnamed Goal',
            })
          } else if (type === 'task-node') {
            connectedTasks.push({
              id: otherId,
              title: props.title || 'Unnamed Task',
              completed: props.completed || false,
            })
          } else if (type === 'budget-node') {
            connectedBudgets.push({
              id: otherId,
              monthlySalary: props.monthlySalary || 0,
              expenses: props.expenses || [],
            })
          }
        }
      }
    }

    // If goals are connected, also find tasks connected to those goals
    for (const goal of connectedGoals) {
      for (const conn of connections) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connProps = conn.props as any
        if (connProps.fromId === goal.id || connProps.toId === goal.id) {
          const taskId = connProps.fromId === goal.id ? connProps.toId : connProps.fromId
          const taskShape = this.editor.getShape(taskId)

          if (taskShape && (taskShape.type as string) === 'task-node') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const taskProps = taskShape.props as any
            // Avoid duplicates
            if (!connectedTasks.find(t => t.id === taskId)) {
              connectedTasks.push({
                id: taskId,
                title: taskProps.title || 'Unnamed Task',
                completed: taskProps.completed || false,
              })
            }
          }
        }
      }
    }

    // Determine data source and generate chart data
    let dataSource = 'manual'
    let dataSourceLabel = 'Manual Data'

    const colorMap: Record<string, { border: string; bar: string; line: string; ring: string }> = {
      violet: { border: 'border-violet-500/60', bar: '#8b5cf6', line: '#8b5cf6', ring: 'ring-violet-500/20' },
      blue: { border: 'border-blue-500/60', bar: '#3b82f6', line: '#3b82f6', ring: 'ring-blue-500/20' },
      green: { border: 'border-green-500/60', bar: '#22c55e', line: '#22c55e', ring: 'ring-green-500/20' },
      orange: { border: 'border-orange-500/60', bar: '#f97316', line: '#f97316', ring: 'ring-orange-500/20' },
      pink: { border: 'border-pink-500/60', bar: '#ec4899', line: '#ec4899', ring: 'ring-pink-500/20' },
      cyan: { border: 'border-cyan-500/60', bar: '#06b6d4', line: '#06b6d4', ring: 'ring-cyan-500/20' },
    }

    const colors = colorMap[color] || colorMap.violet

    // Generate chart data based on view mode and connected nodes
    const { chartData, chartConfig, isIndividualMode } = useMemo((): { chartData: ChartDataItem[]; chartConfig: ChartConfig; isIndividualMode: boolean } => {
      const effectiveViewMode = viewMode || 'overall'
      const showIndividual = effectiveViewMode === 'individual' && connectedHabits.length >= 2

      if (connectedHabits.length > 0) {
        const today = new Date()
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        if (showIndividual) {
          // Individual mode: separate data for each habit
          const config: ChartConfig = {}
          connectedHabits.forEach((habit, idx) => {
            const habitKey = `habit${idx}`
            const habitColor = habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length]
            config[habitKey] = {
              label: habit.name,
              color: habitColor,
            }
          })

          const chartData: ChartDataItem[] = Array.from({ length: numDays }, (_, i) => {
            const date = new Date(today)
            date.setDate(date.getDate() - (numDays - 1 - i))
            const dateStr = date.toISOString().split('T')[0]

            // Use shorter labels when showing many days
            const label = numDays <= 7
              ? dayNames[date.getDay()]
              : `${date.getMonth() + 1}/${date.getDate()}`

            const dayData: ChartDataItem = { label }

            connectedHabits.forEach((habit, idx) => {
              const checkIn = habit.checkIns.find(c => c.date === dateStr)
              dayData[`habit${idx}`] = checkIn?.completed ? 1 : 0
            })

            return dayData
          })

          return { chartData, chartConfig: config, isIndividualMode: true }
        } else {
          // Overall mode: total completions per day
          const config: ChartConfig = {
            total: {
              label: 'Completions',
              color: colors.bar,
            },
          }

          const chartData: ChartDataItem[] = Array.from({ length: numDays }, (_, i) => {
            const date = new Date(today)
            date.setDate(date.getDate() - (numDays - 1 - i))
            const dateStr = date.toISOString().split('T')[0]

            let completedCount = 0
            for (const habit of connectedHabits) {
              const checkIn = habit.checkIns.find(c => c.date === dateStr)
              if (checkIn?.completed) {
                completedCount++
              }
            }

            // Use shorter labels when showing many days
            const label = numDays <= 7
              ? dayNames[date.getDay()]
              : `${date.getMonth() + 1}/${date.getDate()}`

            return {
              label,
              total: completedCount,
            }
          })

          return { chartData, chartConfig: config, isIndividualMode: false }
        }
      } else if (connectedBudgets.length > 0) {
        // Budget data - merge all expenses from connected budgets
        const allExpenses = connectedBudgets.flatMap(b => b.expenses)

        if (chartType === 'pie' || chartType === 'bar') {
          // Pie/Bar chart: expense breakdown by category
          const expensesByCategory: Record<string, number> = {}
          for (const expense of allExpenses) {
            expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount
          }

          const config: ChartConfig = {}
          const chartData: ChartDataItem[] = Object.entries(expensesByCategory).map(([cat, amount]) => {
            const catInfo = budgetCategoryColors[cat] || budgetCategoryColors.other
            config[cat] = {
              label: catInfo.label,
              color: catInfo.color,
            }
            return {
              name: catInfo.label,
              value: amount,
              fill: catInfo.color,
              category: cat,
            }
          })

          return { chartData, chartConfig: config, isIndividualMode: false }
        } else {
          // Line/Area chart: monthly expenses over time
          const monthlyExpenses: Record<string, number> = {}
          for (const expense of allExpenses) {
            const month = expense.date.slice(0, 7) // YYYY-MM
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + expense.amount
          }

          // Get last N months based on width
          const today = new Date()
          const months: string[] = []
          for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
            months.push(d.toISOString().slice(0, 7))
          }

          const config: ChartConfig = {
            expenses: {
              label: 'Expenses',
              color: '#ef4444',
            },
          }

          const chartData: ChartDataItem[] = months.map(month => {
            const [year, mon] = month.split('-')
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return {
              label: monthNames[parseInt(mon) - 1] + ' ' + year.slice(2),
              expenses: monthlyExpenses[month] || 0,
            }
          })

          return { chartData, chartConfig: config, isIndividualMode: false }
        }
      } else if (connectedTasks.length > 0 || connectedGoals.length > 0) {
        const totalTasks = connectedTasks.length
        const completedTasks = connectedTasks.filter(t => t.completed).length
        const pendingTasks = totalTasks - completedTasks

        const config: ChartConfig = {
          done: {
            label: 'Done',
            color: '#22c55e',
          },
          pending: {
            label: 'Pending',
            color: '#71717a',
          },
        }

        if (chartType === 'pie') {
          const chartData: ChartDataItem[] = [
            { name: 'Done', value: completedTasks, fill: '#22c55e' },
            { name: 'Pending', value: pendingTasks, fill: '#71717a' },
          ]
          return { chartData, chartConfig: config, isIndividualMode: false }
        } else {
          const chartData: ChartDataItem[] = connectedTasks.map(task => ({
            label: task.title.slice(0, 8) + (task.title.length > 8 ? '..' : ''),
            value: task.completed ? 100 : 0,
          }))
          return { chartData, chartConfig: config, isIndividualMode: false }
        }
      }

      // Manual data
      const config: ChartConfig = {
        value: {
          label: 'Value',
          color: colors.bar,
        },
      }
      return { chartData: data as ChartDataItem[], chartConfig: config, isIndividualMode: false }
    }, [connectedHabits, connectedGoals, connectedTasks, connectedBudgets, viewMode, chartType, data, colors.bar, numDays, numMonths])

    // Update dataSource labels based on computed values
    if (connectedHabits.length > 0) {
      dataSource = 'habits'
      dataSourceLabel = `${connectedHabits.length} Habit${connectedHabits.length > 1 ? 's' : ''}`
    } else if (connectedBudgets.length > 0) {
      dataSource = 'budget'
      const totalExpenses = connectedBudgets.flatMap(b => b.expenses).length
      dataSourceLabel = `Budget (${totalExpenses} expense${totalExpenses !== 1 ? 's' : ''})`
    } else if (connectedTasks.length > 0 || connectedGoals.length > 0) {
      dataSource = 'tasks'
      const totalTasks = connectedTasks.length
      dataSourceLabel = `${connectedGoals.length > 0 ? connectedGoals.length + ' Goal' + (connectedGoals.length > 1 ? 's' : '') + ' → ' : ''}${totalTasks} Task${totalTasks > 1 ? 's' : ''}`
    }

    const chartHeight = shape.props.h - 100

    const cycleChartType = () => {
      const types = ['bar', 'line', 'area', 'pie']
      const currentIndex = types.indexOf(chartType)
      const nextType = types[(currentIndex + 1) % types.length]
      this.editor.updateShape({
        id: shape.id,
        type: 'chart-node',
        props: { chartType: nextType },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const toggleViewMode = () => {
      const newMode = viewMode === 'individual' ? 'overall' : 'individual'
      this.editor.updateShape({
        id: shape.id,
        type: 'chart-node',
        props: { viewMode: newMode },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const showViewToggle = connectedHabits.length >= 2

    const renderBarChart = () => {
      if (chartData.length === 0) return null

      // For budget data, use 'name' as x-axis and show colored bars per category
      if (dataSource === 'budget') {
        return (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry: ChartDataItem, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )
      }

      return (
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              interval={tickInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={<ChartTooltipContent />}
            />
            {isIndividualMode ? (
              connectedHabits.map((habit, idx) => (
                <Bar
                  key={`habit${idx}`}
                  dataKey={`habit${idx}`}
                  fill={habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar
                dataKey={dataSource === 'manual' ? 'value' : 'total'}
                fill={colors.bar}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ChartContainer>
      )
    }

    const renderLineChart = () => {
      if (chartData.length < 2) return renderBarChart()

      // Get the correct dataKey based on data source
      const getDataKey = () => {
        if (dataSource === 'budget') return 'expenses'
        if (dataSource === 'manual') return 'value'
        return 'total'
      }

      const lineColor = dataSource === 'budget' ? '#ef4444' : colors.line

      return (
        <ChartContainer config={chartConfig} className="h-full w-full">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              interval={tickInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {isIndividualMode ? (
              connectedHabits.map((habit, idx) => (
                <Line
                  key={`habit${idx}`}
                  type="monotone"
                  dataKey={`habit${idx}`}
                  stroke={habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length]}
                  strokeWidth={2}
                  dot={{ fill: habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length], r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={getDataKey()}
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ChartContainer>
      )
    }

    const renderAreaChart = () => {
      if (chartData.length < 2) return renderBarChart()

      // Get the correct dataKey based on data source
      const getDataKey = () => {
        if (dataSource === 'budget') return 'expenses'
        if (dataSource === 'manual') return 'value'
        return 'total'
      }

      const areaColor = dataSource === 'budget' ? '#ef4444' : colors.line

      return (
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              interval={tickInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {isIndividualMode ? (
              connectedHabits.map((habit, idx) => (
                <Area
                  key={`habit${idx}`}
                  type="monotone"
                  dataKey={`habit${idx}`}
                  stroke={habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length]}
                  fill={habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={getDataKey()}
                stroke={areaColor}
                fill={areaColor}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ChartContainer>
      )
    }

    const renderPieChart = () => {
      // For pie chart with habits in individual mode, show total completions per habit over 7 days
      let pieData: ChartDataItem[] = chartData

      if (dataSource === 'habits') {
        if (isIndividualMode || connectedHabits.length >= 1) {
          // Sum completions over 7 days for each habit
          pieData = connectedHabits.map((habit, idx) => {
            const totalCompletions = habit.checkIns.filter(c => {
              const checkDate = new Date(c.date)
              const today = new Date()
              const rangeStart = new Date(today)
              rangeStart.setDate(rangeStart.getDate() - (numDays - 1))
              return c.completed && checkDate >= rangeStart && checkDate <= today
            }).length

            return {
              name: habit.name,
              value: totalCompletions,
              fill: habitColorToHex[habit.color || ''] || defaultColors[idx % defaultColors.length],
            }
          })
        } else {
          // Overall mode for pie: show completed vs not completed days
          const totalPossible = connectedHabits.length * numDays
          const totalCompleted = chartData.reduce((sum: number, d: ChartDataItem) => sum + (d.total || 0), 0)
          pieData = [
            { name: 'Completed', value: totalCompleted, fill: '#22c55e' },
            { name: 'Missed', value: totalPossible - totalCompleted, fill: '#71717a' },
          ]
        }
      }

      const total = pieData.reduce((sum: number, d: ChartDataItem) => sum + (d.value || 0), 0)
      if (total === 0) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No data
          </div>
        )
      }

      const pieConfig: ChartConfig = {}
      pieData.forEach((d: ChartDataItem) => {
        if (d.name) {
          pieConfig[d.name] = {
            label: d.name,
            color: d.fill,
          }
        }
      })

      return (
        <ChartContainer config={pieConfig} className="h-full w-full">
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartHeight * 0.2}
              outerRadius={chartHeight * 0.38}
              paddingAngle={2}
            >
              {pieData.map((entry: ChartDataItem, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      )
    }

    const renderChart = () => {
      switch (chartType) {
        case 'line':
          return renderLineChart()
        case 'area':
          return renderAreaChart()
        case 'pie':
          return renderPieChart()
        default:
          return renderBarChart()
      }
    }

    const chartTypeLabels: Record<string, string> = {
      bar: 'Bar',
      line: 'Line',
      area: 'Area',
      pie: 'Pie',
    }

    const dataSourceColors: Record<string, string> = {
      manual: 'text-zinc-400',
      habits: 'text-green-400',
      tasks: 'text-blue-400',
      budget: 'text-emerald-400',
    }

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <div
          className={`glass-panel-frost ios-scale-in flex h-full w-full flex-col rounded-xl p-3 transition-all ${
            isSelected ? `${colors.border} ring-2 ${colors.ring} ring-offset-0` : colors.border
          }`}
          style={{
            pointerEvents: 'all',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between gap-2">
            {isEditing ? (
              <input
                className="flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-500"
                value={title}
                placeholder="Chart title..."
                autoFocus
                onChange={(e) => {
                  this.editor.updateShape({
                    id: shape.id,
                    type: 'chart-node',
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
                className="min-w-0 flex-1 cursor-text truncate text-sm font-semibold text-white hover:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation()
                  this.editor.setEditingShape(shape.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {title || 'Click to add title...'}
              </h3>
            )}

            <div className="flex shrink-0 items-center gap-1">
              {/* View Mode Toggle */}
              {showViewToggle && (
                <div className="flex rounded bg-zinc-800">
                  <button
                    onClick={() => {
                      if (viewMode !== 'overall') toggleViewMode()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`rounded-l px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      viewMode !== 'individual'
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Total
                  </button>
                  <button
                    onClick={() => {
                      if (viewMode !== 'individual') toggleViewMode()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`rounded-r px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      viewMode === 'individual'
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Each
                  </button>
                </div>
              )}

              {/* Chart Type Selector */}
              <button
                onClick={cycleChartType}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                {chartTypeLabels[chartType]}
              </button>
            </div>
          </div>

          {/* Data Source Indicator */}
          {dataSource !== 'manual' && (
            <div className={`mb-1 text-[10px] font-medium ${dataSourceColors[dataSource]}`}>
              {dataSourceLabel}
              {isIndividualMode && ' (individual)'}
            </div>
          )}

          {/* Chart */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {chartData.length > 0 ? (
              <div style={{ width: shape.props.w - 24, height: chartHeight }}>
                {renderChart()}
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-500">
                Connect habits or goals<br />to see data
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
            <span>
              {dataSource === 'habits'
                ? isIndividualMode
                  ? `${connectedHabits.length} habits`
                  : `Max: ${Math.max(...chartData.map((d: ChartDataItem) => d.total || 0))}/${connectedHabits.length}`
                : dataSource === 'budget'
                  ? chartType === 'pie' || chartType === 'bar'
                    ? `${chartData.length} categories`
                    : `${chartData.filter((d: ChartDataItem) => d.expenses > 0).length} months with data`
                  : dataSource === 'tasks'
                    ? `${connectedTasks.filter(t => t.completed).length}/${connectedTasks.length} done`
                    : `${chartData.length} points`}
            </span>
            {dataSource === 'manual' && (
              <span className="text-zinc-600">Connect nodes for live data</span>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: ChartNodeShape) {
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
  override onResize(shape: ChartNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: ChartNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
