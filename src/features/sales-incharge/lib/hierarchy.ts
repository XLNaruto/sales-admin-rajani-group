import { endpoints } from '@/lib/endpoints'
import type { HierarchyItem } from '../schemas'

/**
 * Org-structure levels, top-down. The new hierarchy API carries geography down
 * to City (no Taluka), so the ladder is National → State → Zone → District →
 * City. National sits above any geography; every other level is backed by a
 * geographic master.
 */
export const HIERARCHY_LEVELS = ['National', 'State', 'Zone', 'District', 'City'] as const
export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number]

/** A City node is staffed by a Sales Incharge; every level above by an Admin. */
export type AssigneeRole = 'sales-incharge' | 'sales-incharge-admin'

/** A node in the assembled org tree (client-facing, camelCase). */
export interface StructureNode {
  id: string
  level: HierarchyLevel
  designation: string
  designationId?: string
  geoId?: string
  geoName?: string
  assigneeId?: string
  assigneeName?: string
  assigneeRole: AssigneeRole
  children: StructureNode[]
}

/**
 * Which geographic master backs each level, plus the response key and label.
 * National has no entry (no geography, no geo select in the dialog).
 */
export const GEO_SOURCE: Partial<
  Record<HierarchyLevel, { endpoint: string; label: string }>
> = {
  State: { endpoint: endpoints.LOCATION.STATES, label: 'State' },
  Zone: { endpoint: endpoints.LOCATION.ZONES, label: 'Zone' },
  District: { endpoint: endpoints.LOCATION.DISTRICTS, label: 'District' },
  City: { endpoint: endpoints.LOCATION.CITIES, label: 'City' },
}

/** The `*_id` field on a hierarchy row that carries each level's geography. */
export const LEVEL_GEO_FIELD: Partial<Record<HierarchyLevel, keyof HierarchyItem>> = {
  State: 'state_id',
  Zone: 'zone_id',
  District: 'district_id',
  City: 'city_id',
}

/** The matching `*_name` field, used to label a node's geography. */
const LEVEL_GEO_NAME_FIELD: Partial<Record<HierarchyLevel, keyof HierarchyItem>> = {
  State: 'state_name',
  Zone: 'zone_name',
  District: 'district_name',
  City: 'city_name',
}

/** Position of a level in the top-down order (National = 0 … City = 4). */
export const levelRank = (level: HierarchyLevel) => HIERARCHY_LEVELS.indexOf(level)

const hasId = (v: unknown) =>
  v !== null && v !== undefined && v !== '' && String(v) !== '0'

/** Infer a row's level from the deepest geographic id that is set. */
export function itemLevel(item: HierarchyItem): HierarchyLevel {
  if (hasId(item.city_id)) return 'City'
  if (hasId(item.district_id)) return 'District'
  if (hasId(item.zone_id)) return 'Zone'
  if (hasId(item.state_id)) return 'State'
  return 'National'
}

/**
 * Assemble the flat GET rows into the nested tree the canvas renders, linking
 * each row to its `parent_id`. The first row without a resolvable parent is the
 * root; the tree is single-rooted.
 */
export function buildTree(items: HierarchyItem[]): StructureNode | null {
  if (!items.length) return null

  const nodes = new Map<string, StructureNode>()
  for (const item of items) {
    const level = itemLevel(item)
    const isCity = level === 'City'
    const geoField = LEVEL_GEO_FIELD[level]
    const geoId = geoField ? item[geoField] : undefined
    const nameField = LEVEL_GEO_NAME_FIELD[level]
    const geoName = nameField ? (item[nameField] as string | null | undefined) : undefined
    nodes.set(String(item.id), {
      id: String(item.id),
      level,
      designation: item.designation_name ?? '',
      designationId: hasId(item.designation_id) ? String(item.designation_id) : undefined,
      geoId: hasId(geoId) ? String(geoId) : undefined,
      geoName: geoName || undefined,
      assigneeId: isCity
        ? hasId(item.sales_incharge_id)
          ? String(item.sales_incharge_id)
          : undefined
        : hasId(item.sales_incharge_admin_id)
          ? String(item.sales_incharge_admin_id)
          : undefined,
      assigneeName: item.user_name || undefined,
      assigneeRole: isCity ? 'sales-incharge' : 'sales-incharge-admin',
      children: [],
    })
  }

  let root: StructureNode | null = null
  for (const item of items) {
    const node = nodes.get(String(item.id))!
    const parentId = hasId(item.parent_id) ? String(item.parent_id) : null
    const parent = parentId && parentId !== String(item.id) ? nodes.get(parentId) : undefined
    if (parent) parent.children.push(node)
    else if (!root) root = node
  }
  return root
}

/** Depth-first lookup of a node by id within a tree. */
export function findNode(node: StructureNode, targetId: string): StructureNode | null {
  if (node.id === targetId) return node
  for (const child of node.children) {
    const found = findNode(child, targetId)
    if (found) return found
  }
  return null
}
