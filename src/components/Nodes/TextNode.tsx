'use client'

import type { TextNode as TextNodeType } from '@/types'
import { BaseNode } from './BaseNode'

interface TextNodeProps {
  node: TextNodeType
  selected?: boolean
  onSelect?: () => void
  onChange?: (content: string) => void
}

// Placeholder for TextNode component
// Will be implemented in Step 2: Canvas Foundation

export function TextNode({ node, selected, onSelect, onChange }: TextNodeProps) {
  return (
    <BaseNode node={node} selected={selected} onSelect={onSelect}>
      <div
        className="h-full w-full overflow-auto"
        style={{
          color: node.color,
          backgroundColor: node.backgroundColor,
          fontSize: node.fontSize,
          fontFamily: node.fontFamily,
        }}
      >
        {node.content || 'Empty text node'}
      </div>
    </BaseNode>
  )
}
