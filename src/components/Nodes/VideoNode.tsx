'use client'

import type { VideoNode as VideoNodeType } from '@/types'
import { BaseNode } from './BaseNode'

interface VideoNodeProps {
  node: VideoNodeType
  selected?: boolean
  onSelect?: () => void
}

// Placeholder for VideoNode component
// Will be implemented in Step 5: Video Editor

export function VideoNode({ node, selected, onSelect }: VideoNodeProps) {
  return (
    <BaseNode node={node} selected={selected} onSelect={onSelect}>
      <div className="h-full w-full">
        <h3 className="font-semibold">{node.title}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`rounded px-2 py-1 text-xs ${
              node.status === 'completed'
                ? 'bg-green-500/20 text-green-500'
                : node.status === 'processing'
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : node.status === 'failed'
                    ? 'bg-red-500/20 text-red-500'
                    : 'bg-blue-500/20 text-blue-500'
            }`}
          >
            {node.status}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
