import { Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Salesman } from '@/features/sales-incharge'
import type { HierarchyNode } from '../types'

interface TreeHandlers {
  salesmenById: Map<string, Salesman>
  onAdd: (node: HierarchyNode) => void
  onRemove: (node: HierarchyNode, isRoot: boolean) => void
}

/** A single org-chart card: avatar, name, designation + add/remove actions. */
function NodeCard({
  node,
  isRoot,
  salesmenById,
  onAdd,
  onRemove,
}: { node: HierarchyNode; isRoot: boolean } & TreeHandlers) {
  const salesman = salesmenById.get(node.salesmanId)

  return (
    <div
      data-hierarchy-root={isRoot ? '' : undefined}
      className={cn(
        'group relative w-40 rounded-xl border bg-card p-3 text-center shadow-sm transition-colors sm:w-56 sm:p-4',
        isRoot ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border hover:border-ring/40',
      )}
    >
      {isRoot && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Root
        </span>
      )}

      <div className="flex flex-col items-center gap-2">
        <Avatar
          name={salesman?.name ?? '?'}
          src={salesman?.photoUrl}
          className="size-11 text-xs sm:size-14 sm:text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
            {salesman?.name ?? 'Unknown salesman'}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
            {salesman?.designation ?? '—'}
          </p>
        </div>
      </div>

      {/* Actions — always visible. */}
      <div className="mt-2.5 flex items-center justify-center gap-2 sm:mt-3">
        <button
          type="button"
          title="Add report"
          onClick={() => onAdd(node)}
          className="grid size-7 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20 sm:size-8"
        >
          <Plus className="size-3.5 sm:size-4" />
        </button>
        <button
          type="button"
          title={isRoot ? 'Remove root (clears hierarchy)' : 'Remove'}
          onClick={() => onRemove(node, isRoot)}
          className="grid size-7 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400 sm:size-8"
        >
          <Trash2 className="size-3.5 sm:size-4" />
        </button>
      </div>
    </div>
  )
}

/** Recursive tree node: renders its card, then a child row if it has reports. */
function TreeNode({
  node,
  isRoot,
  ...handlers
}: { node: HierarchyNode; isRoot: boolean } & TreeHandlers) {
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

/** The full org-chart. `w-max` lets it overflow the pan canvas horizontally. */
export function HierarchyTree({
  root,
  ...handlers
}: { root: HierarchyNode } & TreeHandlers) {
  return (
    <div className="org-tree mx-auto w-max px-12 py-10">
      <ul>
        <TreeNode node={root} isRoot {...handlers} />
      </ul>
    </div>
  )
}
