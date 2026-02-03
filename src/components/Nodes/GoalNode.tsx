'use client'

import type { GoalNode as GoalNodeType } from '@/types'
import { BaseNode } from './BaseNode'

interface GoalNodeProps {
  node: GoalNodeType
  selected?: boolean
  onSelect?: () => void
}

// Placeholder for GoalNode component
// Will be implemented in Step 4: Goal Tracker

export function GoalNode({ node, selected, onSelect }: GoalNodeProps) {
  return (
    <BaseNode node={node} selected={selected} onSelect={onSelect}>
      <div className="h-full w-full">
        <h3 className="font-semibold">{node.title}</h3>
        <p className="text-sm text-muted-foreground">{node.description}</p>
        <div className="mt-2">
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${node.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{node.progress}%</span>
        </div>
      </div>
    </BaseNode>
  )
}
