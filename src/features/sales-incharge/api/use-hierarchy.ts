import { useMemo } from 'react'
import {
  useClearSalesInchargeHierarchy,
  useSalesInchargeHierarchy,
  useSetReportingManager,
  useSetSalesInchargeRoot,
} from './use-sales-incharge'
import type { HierarchyNode, SalesInchargeHierarchyNode } from '../types'

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
 * node shape. The tree is single-rooted — `root` is the one designated
 * top-of-org node (with its nested reports), or `null` when none is set.
 */
export function useHierarchy() {
  const query = useSalesInchargeHierarchy()
  const root = useMemo(() => (query.data ? toNode(query.data) : null), [query.data])
  return { ...query, root }
}

/**
 * PATCH …/{id}/root — designate the single top-of-org root. Used to seed the
 * tree when it's empty (no card exists yet to add a report under).
 */
export function useSetRoot() {
  return useSetSalesInchargeRoot()
}

/**
 * PATCH …/{id}/reporting-manager — place a salesman under a parent already in
 * the tree.
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
