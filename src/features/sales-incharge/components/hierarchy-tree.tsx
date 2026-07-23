import { Layers, MapPin, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Hint } from '@/components/common/hint'
import { cn } from '@/lib/utils'
import {
  HIERARCHY_LEVELS,
  levelRank,
  type HierarchyLevel,
  type StructureNode,
} from '../lib/hierarchy'

/** A distinct accent per level so the tree reads at a glance. */
const LEVEL_STYLES: Record<HierarchyLevel, string> = {
  National: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  State: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Zone: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  District: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  City: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

interface TreeHandlers {
  onAdd: (node: StructureNode) => void
  onEdit: (node: StructureNode) => void
  onRemove: (node: StructureNode, isRoot: boolean) => void
}

/** A single org-chart card: level badge, designation, geography + assignee. */
function NodeCard({
  node,
  isRoot,
  onAdd,
  onEdit,
  onRemove,
}: { node: StructureNode; isRoot: boolean } & TreeHandlers) {
  // The lowest level (City) can't nest any further, so there's nothing to add.
  const canAddChild = levelRank(node.level) < HIERARCHY_LEVELS.length - 1

  return (
    <div
      data-hierarchy-root={isRoot ? '' : undefined}
      className={cn(
        'relative flex w-52 flex-col items-center rounded-2xl border bg-card px-4 pb-4 pt-6 text-center shadow-sm transition-colors',
        isRoot ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border hover:border-ring/40',
      )}
    >
      {isRoot && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
          Root
        </span>
      )}

      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
          LEVEL_STYLES[node.level],
        )}
      >
        <Layers className="size-3" />
        {node.level}
      </span>

      <p className="mt-3 font-semibold leading-tight text-foreground">
        {node.designation || 'Untitled'}
      </p>

      {node.geoName && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <MapPin className="size-3" />
          {node.geoName}
        </span>
      )}

      {node.assigneeName && (
        <Hint label={node.assigneeName}>
          <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <UserRound className="size-3 shrink-0" />
            <span className="min-w-0 truncate">{node.assigneeName}</span>
          </span>
        </Hint>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        {canAddChild && (
          <Hint label="Add sub-level">
            <button
              type="button"
              onClick={() => onAdd(node)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Plus className="size-4" />
            </button>
          </Hint>
        )}
        {/* The root is provisioned from the Super Admin panel — it can gain
            children here, but its own record can't be edited or removed. */}
        {!isRoot && (
          <Hint label="Edit">
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-muted text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <Pencil className="size-4" />
            </button>
          </Hint>
        )}
        {!isRoot && (
          <Hint label="Remove">
            <button
              type="button"
              onClick={() => onRemove(node, isRoot)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          </Hint>
        )}
      </div>
    </div>
  )
}

/** Recursive tree node: renders its card, then a child row if it has children. */
function TreeNode({
  node,
  isRoot,
  ...handlers
}: { node: StructureNode; isRoot: boolean } & TreeHandlers) {
  return (
    <li>
      <NodeCard node={node} isRoot={isRoot} {...handlers} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} isRoot={false} {...handlers} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * The full org-chart, rendered from the single root down. `w-max` lets it
 * overflow the pan canvas horizontally; the pure-CSS `.org-tree` connectors
 * draw the parent/child lines.
 */
export function HierarchyTree({
  root,
  ...handlers
}: { root: StructureNode } & TreeHandlers) {
  return (
    <div className="org-tree mx-auto flex w-max items-start justify-center px-12 py-10">
      <ul>
        <TreeNode node={root} isRoot {...handlers} />
      </ul>
    </div>
  )
}
