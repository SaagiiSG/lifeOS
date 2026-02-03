'use client'

import type { BaseNode as BaseNodeType } from '@/types'

interface BaseNodeProps {
  node: BaseNodeType
  selected?: boolean
  onSelect?: () => void
  children?: React.ReactNode
}

// Placeholder for BaseNode component
// Will be implemented in Step 2: Canvas Foundation

export function BaseNode({ node, selected, onSelect, children }: BaseNodeProps) {
  return (
    <div
      className={`absolute rounded-lg border bg-card p-4 ${
        selected ? 'border-primary ring-2 ring-primary' : 'border-border'
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      onClick={onSelect}
    >
      {children}
    </div>
  )
}
