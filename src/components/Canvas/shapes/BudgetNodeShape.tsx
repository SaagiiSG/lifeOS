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
} from 'tldraw'

const expenseCategories = [
  { id: 'food', label: 'Food', icon: '🍔', color: '#f97316' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { id: 'bills', label: 'Bills', icon: '📄', color: '#ef4444' },
  { id: 'health', label: 'Health', icon: '💊', color: '#22c55e' },
  { id: 'other', label: 'Other', icon: '📦', color: '#71717a' },
]

const budgetNodeShapeProps = {
  w: T.number,
  h: T.number,
  monthlySalary: T.number,
  currency: T.string,
  expenses: T.arrayOf(
    T.object({
      id: T.string,
      amount: T.number,
      category: T.string,
      description: T.string,
      date: T.string,
    })
  ),
  monthlyHistory: T.arrayOf(
    T.object({
      month: T.string, // YYYY-MM format
      salary: T.number,
      totalExpenses: T.number,
    })
  ),
}

type BudgetNodeShapeProps = RecordPropsType<typeof budgetNodeShapeProps>

export type BudgetNodeShape = TLBaseShape<'budget-node', BudgetNodeShapeProps>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class BudgetNodeShapeUtil extends ShapeUtil<any> {
  static override type = 'budget-node' as const
  static override props = budgetNodeShapeProps

  getDefaultProps(): BudgetNodeShapeProps {
    return {
      w: 320,
      h: 400,
      monthlySalary: 0,
      currency: 'USD',
      expenses: [],
      monthlyHistory: [],
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
    const { monthlySalary, currency, expenses, monthlyHistory } = shape.props
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)

    // Get current month expenses
    const currentMonth = new Date().toISOString().slice(0, 7)
    const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonth))
    const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const remaining = monthlySalary - totalExpenses

    // Group expenses by category
    const expensesByCategory = currentMonthExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    const formatAmount = (amt: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amt)
    }

    const updateSalary = (value: number) => {
      this.editor.updateShape({
        id: shape.id,
        type: 'budget-node',
        props: { monthlySalary: value },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const addExpense = (category: string, amount: number, description: string) => {
      const newExpense = {
        id: crypto.randomUUID(),
        amount,
        category,
        description,
        date: new Date().toISOString().split('T')[0],
      }
      this.editor.updateShape({
        id: shape.id,
        type: 'budget-node',
        props: { expenses: [...expenses, newExpense] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }

    const deleteExpense = (expenseId: string) => {
      this.editor.updateShape({
        id: shape.id,
        type: 'budget-node',
        props: { expenses: expenses.filter(e => e.id !== expenseId) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
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
          className={`glass-panel-frost ios-scale-in flex h-full w-full flex-col rounded-xl transition-all ${
            isSelected ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 ring-offset-0' : 'border-emerald-500/60'
          }`}
          style={{
            pointerEvents: 'all',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {/* Header - Monthly Salary */}
          <div className="border-b border-white/[0.06] p-4">
            <div className="mb-2 text-xs font-medium text-zinc-400">Monthly Salary</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <input
                type="number"
                value={monthlySalary || ''}
                placeholder="0"
                onChange={(e) => updateSalary(Number(e.target.value) || 0)}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-1 bg-transparent text-3xl font-bold text-emerald-400 outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] p-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <div className="text-[10px] text-red-400">Spent</div>
              <div className="text-lg font-bold text-red-400">{formatAmount(totalExpenses)}</div>
            </div>
            <div className={`rounded-lg p-2 ${remaining >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <div className={`text-[10px] ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Remaining</div>
              <div className={`text-lg font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatAmount(remaining)}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="border-b border-white/[0.06] p-3">
              <div className="mb-2 text-[10px] font-medium text-zinc-500">BY CATEGORY</div>
              <div className="flex flex-wrap gap-1">
                {expenseCategories
                  .filter(cat => expensesByCategory[cat.id])
                  .map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      style={{ backgroundColor: cat.color + '20', color: cat.color }}
                    >
                      <span>{cat.icon}</span>
                      <span>{formatAmount(expensesByCategory[cat.id])}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          <div className="flex-1 overflow-hidden p-3">
            <div className="mb-2 text-[10px] font-medium text-zinc-500">RECENT EXPENSES</div>
            <div className="flex max-h-[120px] flex-col gap-1 overflow-y-auto">
              {currentMonthExpenses.length === 0 ? (
                <div className="py-2 text-center text-xs text-zinc-600">No expenses yet</div>
              ) : (
                [...currentMonthExpenses].reverse().slice(0, 10).map(expense => {
                  const cat = expenseCategories.find(c => c.id === expense.category) || expenseCategories[6]
                  return (
                    <div
                      key={expense.id}
                      className="group flex items-center gap-2 rounded-lg bg-zinc-800/50 px-2 py-1.5"
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span className="flex-1 truncate text-xs text-zinc-300">
                        {expense.description || cat.label}
                      </span>
                      <span className="text-xs font-medium text-red-400">
                        -{formatAmount(expense.amount)}
                      </span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="hidden text-zinc-500 hover:text-red-400 group-hover:block"
                      >
                        ×
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Add Expense Form */}
          <ExpenseForm onAdd={addExpense} formatAmount={formatAmount} />
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: BudgetNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }

  override canEdit() {
    return false
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
}

// Separate component for the expense form to manage local state
function ExpenseForm({
  onAdd,
}: {
  onAdd: (category: string, amount: number, description: string) => void
  formatAmount: (amt: number) => string
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [description, setDescription] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = () => {
    const numAmount = Number(amount)
    if (numAmount > 0) {
      onAdd(category, numAmount, description)
      setAmount('')
      setDescription('')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={() => setIsOpen(true)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full rounded-lg bg-zinc-800 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
        >
          + Add Expense
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-white/[0.06] p-3">
      <div className="mb-2 flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Amount"
          className="w-24 rounded-lg bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-emerald-500"
          autoFocus
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Description"
          className="flex-1 rounded-lg bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {expenseCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`rounded-full px-2 py-0.5 text-xs transition-all ${
              category === cat.id
                ? 'ring-2 ring-white/30'
                : ''
            }`}
            style={{
              backgroundColor: category === cat.id ? cat.color : cat.color + '30',
              color: category === cat.id ? 'white' : cat.color,
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Add
        </button>
      </div>
    </div>
  )
}
