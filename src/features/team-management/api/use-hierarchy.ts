import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockDelay } from '@/lib/utils'
import type { HierarchyNode } from '../types'

const newId = () => `node-${crypto.randomUUID().slice(0, 8)}`

// In-memory hierarchy tree (mock persistence). Salesman ids map to the
// Sales Incharge list (sm1..sm8). Seeded with a sample org so the canvas
// isn't empty on first load.
let ROOT: HierarchyNode | null = {
  id: newId(),
  salesmanId: 'sm7',
  children: [
    {
      id: newId(),
      salesmanId: 'sm1',
      children: [
        { id: newId(), salesmanId: 'sm2', children: [] },
        { id: newId(), salesmanId: 'sm3', children: [] },
      ],
    },
    {
      id: newId(),
      salesmanId: 'sm4',
      children: [
        { id: newId(), salesmanId: 'sm5', children: [] },
        { id: newId(), salesmanId: 'sm6', children: [] },
      ],
    },
  ],
}

/** Depth-first search for a node by id. */
function findNode(node: HierarchyNode | null, id: string): HierarchyNode | null {
  if (!node) return null
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

/** Collect every salesmanId currently placed in the tree. */
function collectSalesmanIds(node: HierarchyNode | null, acc: string[] = []): string[] {
  if (!node) return acc
  acc.push(node.salesmanId)
  node.children.forEach((c) => collectSalesmanIds(c, acc))
  return acc
}

export function useHierarchy() {
  return useQuery({
    queryKey: queryKeys.team.hierarchy(),
    queryFn: () => mockDelay(ROOT ? structuredClone(ROOT) : null),
  })
}

/** Set (or replace) the root salesman of the hierarchy. */
export function useSetRoot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (salesmanId: string) => {
      ROOT = { id: newId(), salesmanId, children: [] }
      return mockDelay(structuredClone(ROOT), 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.hierarchy() }),
  })
}

/** Add a salesman as a direct report under an existing node. */
export function useAddNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, salesmanId }: { parentId: string; salesmanId: string }) => {
      const parent = findNode(ROOT, parentId)
      if (parent) parent.children.push({ id: newId(), salesmanId, children: [] })
      return mockDelay({ parentId, salesmanId }, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.hierarchy() }),
  })
}

/** Remove a node (and its whole subtree). Removing the root clears the tree. */
export function useRemoveNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nodeId: string) => {
      if (ROOT?.id === nodeId) {
        ROOT = null
      } else {
        const prune = (node: HierarchyNode) => {
          node.children = node.children.filter((c) => c.id !== nodeId)
          node.children.forEach(prune)
        }
        if (ROOT) prune(ROOT)
      }
      return mockDelay({ nodeId }, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.hierarchy() }),
  })
}

/** Salesman ids already present in the tree — used to keep the picker unique. */
export function usedSalesmanIds(root: HierarchyNode | null) {
  return new Set(collectSalesmanIds(root))
}
