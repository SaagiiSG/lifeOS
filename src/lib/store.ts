import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { BaseNode, CanvasState } from '@/types'

interface AppState {
  // Canvas state
  canvas: CanvasState | null
  nodes: BaseNode[]
  selectedNodeId: string | null

  // UI state
  isSaving: boolean
  lastSavedAt: string | null

  // Actions
  setCanvas: (canvas: CanvasState) => void
  addNode: (node: BaseNode) => void
  updateNode: (id: string, updates: Partial<BaseNode>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  setNodes: (nodes: BaseNode[]) => void

  // Persistence
  setSaving: (isSaving: boolean) => void
  setLastSaved: (timestamp: string) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        canvas: null,
        nodes: [],
        selectedNodeId: null,
        isSaving: false,
        lastSavedAt: null,

        // Canvas actions
        setCanvas: (canvas) => set({ canvas }),

        // Node actions
        addNode: (node) =>
          set((state) => ({
            nodes: [...state.nodes, node],
          })),

        updateNode: (id, updates) =>
          set((state) => ({
            nodes: state.nodes.map((node) =>
              node.id === id ? { ...node, ...updates, updatedAt: new Date().toISOString() } : node
            ),
          })),

        removeNode: (id) =>
          set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== id),
            selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          })),

        selectNode: (id) => set({ selectedNodeId: id }),

        setNodes: (nodes) => set({ nodes }),

        // Persistence actions
        setSaving: (isSaving) => set({ isSaving }),
        setLastSaved: (timestamp) => set({ lastSavedAt: timestamp, isSaving: false }),
      }),
      {
        name: 'lifeos-storage',
        partialize: (state) => ({
          canvas: state.canvas,
          nodes: state.nodes,
        }),
      }
    ),
    { name: 'LifeOS Store' }
  )
)
