import { useMemo, useState } from 'react'
import { Minus, Network, Plus, RotateCcw, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useSalesmen } from '@/features/sales-incharge'
import {
  useAddNode,
  useHierarchy,
  useRemoveNode,
  useSetRoot,
  usedSalesmanIds,
} from '../api/use-hierarchy'
import { HierarchyTree } from '../components/hierarchy-tree'
import { PanCanvas } from '../components/pan-canvas'
import { SalesmanPickerDialog } from '../components/salesman-picker-dialog'
import type { HierarchyNode } from '../types'

export function SalesmanHierarchyPage() {
  const { data: root, isLoading } = useHierarchy()
  const { data: salesmen } = useSalesmen()
  const setRoot = useSetRoot()
  const addNode = useAddNode()
  const removeNode = useRemoveNode()

  const salesmenById = useMemo(
    () => new Map((salesmen ?? []).map((s) => [s.id, s])),
    [salesmen],
  )

  // Salesmen not yet placed in the tree — the pool the pickers draw from.
  const availableOptions = useMemo<ComboboxOption[]>(() => {
    const used = usedSalesmanIds(root ?? null)
    return (salesmen ?? [])
      .filter((s) => !used.has(s.id))
      .map((s) => ({ value: s.id, label: `${s.name} — ${s.designation}` }))
  }, [salesmen, root])

  const [zoom, setZoom] = useState(1)
  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, Math.round(z * 10) / 10))
  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta * 0.1))

  const [rootPickerOpen, setRootPickerOpen] = useState(false)
  const [addParent, setAddParent] = useState<HierarchyNode | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{
    node: HierarchyNode
    isRoot: boolean
  } | null>(null)

  const handleSetRoot = (salesmanId: string) => {
    setRoot.mutate(salesmanId, {
      onSuccess: () => {
        toast.success('Root salesman set')
        setRootPickerOpen(false)
      },
      onError: () => toast.error("Couldn't set the root salesman."),
    })
  }

  const handleAdd = (salesmanId: string) => {
    if (!addParent) return
    addNode.mutate(
      { parentId: addParent.id, salesmanId },
      {
        onSuccess: () => {
          toast.success('Report added')
          setAddParent(null)
        },
        onError: () => toast.error("Couldn't add the report."),
      },
    )
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    const { node, isRoot } = pendingRemove
    removeNode.mutate(node.id, {
      onSuccess: () =>
        toast.success(isRoot ? 'Hierarchy cleared' : 'Removed from hierarchy'),
      onError: () => toast.error("Couldn't remove the node."),
    })
  }

  const removedName = pendingRemove
    ? (salesmenById.get(pendingRemove.node.salesmanId)?.name ?? 'This salesman')
    : ''

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Salesman Hierarchy"
        description="Build the reporting structure — drag the canvas to pan, hover a card to add or remove reports."
        actions={
          root ? (
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setPendingRemove({ node: root, isRoot: true })}
            >
              <Trash2 /> Clear hierarchy
            </Button>
          ) : undefined
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
        {isLoading ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Loading hierarchy…
          </div>
        ) : root ? (
          <div className="relative h-full w-full">
            <PanCanvas className="h-full w-full" onZoomDelta={zoomBy}>
              <div style={{ zoom }}>
                <HierarchyTree
                  root={root}
                  salesmenById={salesmenById}
                  onAdd={(node) => setAddParent(node)}
                  onRemove={(node, isRoot) => setPendingRemove({ node, isRoot })}
                />
              </div>
            </PanCanvas>

            {/* Zoom controls */}
            <div
              data-nopan
              className="absolute right-4 top-4 flex items-center gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-md backdrop-blur"
            >
              <button
                type="button"
                title="Zoom out"
                onClick={() => zoomBy(-1)}
                disabled={zoom <= 0.5}
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                title="Reset zoom"
                onClick={() => setZoom(1)}
                className="min-w-12 cursor-pointer rounded-lg px-2 py-1.5 text-center text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-accent"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                title="Zoom in"
                onClick={() => zoomBy(1)}
                disabled={zoom >= 2}
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
              <span className="mx-0.5 h-5 w-px bg-border" />
              <button
                type="button"
                title="Reset zoom"
                onClick={() => setZoom(1)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8">
            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Network className="size-7" />
              </span>
              <div>
                <p className="font-medium text-foreground">No hierarchy yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a salesman as the root, then add reports beneath them to
                  build out the tree.
                </p>
              </div>
              <Button className="cursor-pointer" onClick={() => setRootPickerOpen(true)}>
                <UserPlus /> Select root salesman
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Root picker */}
      <SalesmanPickerDialog
        open={rootPickerOpen}
        onOpenChange={setRootPickerOpen}
        title="Select root salesman"
        description="This person sits at the top of the reporting structure."
        options={availableOptions}
        confirmLabel="Set as root"
        loading={setRoot.isPending}
        onConfirm={handleSetRoot}
      />

      {/* Add-report picker */}
      <SalesmanPickerDialog
        open={addParent !== null}
        onOpenChange={(open) => !open && setAddParent(null)}
        title="Add a report"
        description={
          addParent
            ? `Reports to ${salesmenById.get(addParent.salesmanId)?.name ?? 'this salesman'}.`
            : undefined
        }
        options={availableOptions}
        confirmLabel="Add report"
        loading={addNode.isPending}
        onConfirm={handleAdd}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        variant="destructive"
        icon={Trash2}
        title={pendingRemove?.isRoot ? 'Clear the hierarchy?' : 'Remove from hierarchy?'}
        description={
          pendingRemove ? (
            <>
              <span className="font-medium text-foreground">{removedName}</span>{' '}
              {pendingRemove.isRoot
                ? 'is the root — removing them clears the entire hierarchy.'
                : 'and all of their reports will be removed from the tree.'}
            </>
          ) : undefined
        }
        confirmLabel="Yes, remove"
        cancelLabel="Cancel"
        loading={removeNode.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
