import { useMemo } from 'react'
import {
  useClearSalesInchargeHierarchy,
  useSalesInchargeHierarchy,
  useSetReportingManager,
  type SalesInchargeHierarchyNode,
} from '@/features/sales-incharge'
import type { HierarchyNode } from '../types'

/** Map a sales-incharge hierarchy node (recursively) to the canvas node shape. */
function toNode(n: SalesInchargeHierarchyNode): HierarchyNode {
  return {
    id: String(n.id),
    salesmanId: String(n.id),
    name: n.name,
    designation: n.designation,
    photoUrl: n.photoUrl,
    children: n.reports.map(toNode),
  }
}

/**
 * GET /sales-incharge-admin/sales-incharges/hierarchy, mapped to the canvas's
 * node shape. The tree is multi-root — `roots` are the incharges with no
 * reporting manager, each with its nested reports.
 */
export function useHierarchy() {
  const query = useSalesInchargeHierarchy()
  const roots = useMemo(() => (query.data ?? []).map(toNode), [query.data])
  return { ...query, roots }
}

/**
 * PATCH …/{id}/reporting-manager — place a salesman under a parent (or detach).
 * `reportsTo = null` makes the incharge a root.
 */
export function useAddReport() {
  return useSetReportingManager()
}

/** DELETE …/{id}/hierarchy — remove a node and its whole subtree from the tree. */
export function useRemoveNode() {
  return useClearSalesInchargeHierarchy()
}

/** Every incharge id in `node`'s subtree (including itself), as strings. */
export function subtreeIds(node: HierarchyNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.id)
  node.children.forEach((c) => subtreeIds(c, acc))
  return acc
}
