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

const budgetNodeShapeProps = {
  w: T.number,
  h: T.number,
  title: T.string,
  type: T.string, // 'income' | 'expense'
  amount: T.number,
  category: T.string,
  date: T.string,
  description: T.string,
  color: T.string,
}

type BudgetNodeShapeProps = RecordPropsType<typeof budgetNodeShapeProps>

export type BudgetNodeShape = TLBaseShape<'budget-node', BudgetNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class BudgetNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'budget-node' as const
  static override props = budgetNodeShapeProps

  getDefaultProps(): BudgetNodeShapeProps {
    return {
      w: 240,
      h: 140,
      title: 'New Transaction',
      type: 'expense',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      color: 'emerald',
    }
  }

  getGeometry(shape: BudgetNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: BudgetNodeShape) {
    const { title, type, amount, category, date, description, color } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
    const isEditing = this.editor.getEditingShapeId() === shape.id

    const isIncome = type === 'income'

    const colorMap: Record<string, { bg: string; border: string }> = {
      emerald: { bg: 'bg-emerald-950/80', border: 'border-emerald-500' },
      blue: { bg: 'bg-blue-950/80', border: 'border-blue-500' },
      purple: { bg: 'bg-purple-950/80', border: 'border-purple-500' },
      orange: { bg: 'bg-orange-950/80', border: 'border-orange-500' },
      red: { bg: 'bg-red-950/80', border: 'border-red-500' },
      yellow: { bg: 'bg-yellow-950/80', border: 'border-yellow-500' },
    }

    const colors = colorMap[color] || colorMap.emerald

    const formatAmount = (amt: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amt)
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
          className={`flex h-full w-full flex-col rounded-xl border-2 ${colors.bg} p-3 backdrop-blur-sm transition-all ${
            isSelected ? `${colors.border} ring-2 ring-offset-0` : 'border-zinc-700'
          }`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  isIncome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isIncome ? '↑' : '↓'}
              </div>
              {isEditing ? (
                <input
                  className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-zinc-500"
                  value={title}
                  placeholder="Transaction name..."
                  autoFocus
                  onChange={(e) => {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'budget-node',
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
                  className="cursor-text text-sm font-medium text-white hover:text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    this.editor.setEditingShape(shape.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {title || 'Click to name...'}
                </h3>
              )}
            </div>
            <button
              onClick={() => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'budget-node',
                  props: { type: isIncome ? 'expense' : 'income' },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                isIncome
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {isIncome ? 'Income' : 'Expense'}
            </button>
          </div>

          {/* Amount */}
          <div className="mb-2">
            <div
              className={`text-2xl font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}
            >
              {isIncome ? '+' : '-'}{formatAmount(amount)}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col gap-1 text-xs">
            {category && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Category:</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{category}</span>
              </div>
            )}
            {description && (
              <p className="text-zinc-400 line-clamp-2">{description}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
            <span>{formatDate(date)}</span>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: BudgetNodeShape) {
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
  override onResize(shape: BudgetNodeShape, info: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return resizeBox(shape as any, info)
  }

  override onDoubleClick(shape: BudgetNodeShape) {
    this.editor.setEditingShape(shape.id)
  }
}
