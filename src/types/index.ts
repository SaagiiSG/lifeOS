// Core types for LifeOS

export * from './database'

// Node Types
export type NodeType = 'text' | 'goal' | 'video' | 'image' | 'link' | 'embed'

export interface BaseNode {
  id: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  locked?: boolean
  createdAt: string
  updatedAt: string
}

export interface TextNode extends BaseNode {
  type: 'text'
  content: string
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
}

export interface GoalNode extends BaseNode {
  type: 'goal'
  title: string
  description?: string
  quarter?: string // e.g., "Q1 2026"
  targetDate?: string
  progress: number
  status: 'active' | 'completed' | 'archived'
  rolledOverFrom?: string // Previous quarter if rolled over
  milestones?: Milestone[]
  checkIns?: CheckIn[]
}

export interface Milestone {
  id: string
  title: string
  targetDate?: string
  completed: boolean
  completedAt?: string
}

export interface CheckIn {
  id: string
  date: string
  progress: number
  notes?: string
}

export interface VideoNode extends BaseNode {
  type: 'video'
  title: string
  sourceUrl?: string
  outputUrl?: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  thumbnailUrl?: string
  duration?: number
}

// Canvas State
export interface CanvasState {
  id: string
  name: string
  nodes: BaseNode[]
  zoom: number
  panX: number
  panY: number
}

// User preferences
export interface UserPreferences {
  theme: 'dark' | 'light'
  defaultNodeColor: string
  autoSave: boolean
  autoSaveInterval: number
}
