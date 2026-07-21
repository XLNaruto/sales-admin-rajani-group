import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useSalesIncharges } from '../api/use-sales-incharge'
import {
  subtreeIds,
  useAddReport,
  useHierarchy,
  useRemoveNode,
  useSetRoot,
} from '../api/use-hierarchy'
import type { HierarchyNode } from '../types'

/** All incharge ids currently placed in the tree (root + every descendant). */
function treeIds(root: HierarchyNode | null): Set<string> {
  return root ? subtreeIds(root) : new Set<string>()
}

/**
 * Orchestrates the salesman-hierarchy canvas: the hierarchy query (single-root)
 * + the sales-incharge list that feeds the pickers, the pan/zoom + centering
 * behaviour, the picker/confirm dialog state and the root / reporting-manager /
 * clear-hierarchy mutations. The page consumes this and only renders.
 */
export function useSalesInchargeHierarchyView() {
  const { root, isLoading } = useHierarchy()
  const setRoot = useSetRoot()
  const addReport = useAddReport()
  const removeNode = useRemoveNode()

  // The salesman pool for the pickers comes from the live sales-incharge list
  // (active incharges), not a mock array.
  const { data: list } = useSalesIncharges({
    status: 'active',
    pageSize: 100,
    sortBy: 'display_name',
    sortOrder: 'asc',
  })
  const incharges = list?.items

  const [addParent, setAddParent] = useState<HierarchyNode | null>(null)
  // Whether the "designate root" picker is open (only reachable with no root).
  const [rootPickerOpen, setRootPickerOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{
    node: HierarchyNode
    isRoot: boolean
  } | null>(null)

  const optionOf = (id: string, label: string): ComboboxOption => ({ value: id, label })

  // Any active incharge may be designated the first root — nobody is placed yet.
  const rootOptions = useMemo<ComboboxOption[]>(
    () =>
      (incharges ?? []).map((s) =>
        optionOf(
          String(s.id),
          s.designation ? `${s.displayName} — ${s.designation}` : s.displayName,
        ),
      ),
    [incharges],
  )

  // Placing a salesman under `addParent` may draw from anyone not already in
  // the tree (the server requires the node be unplaced; it also rejects cycles).
  const availableOptions = useMemo<ComboboxOption[]>(() => {
    if (!addParent) return []
    const placed = treeIds(root)
    return (incharges ?? [])
      .filter((s) => !placed.has(String(s.id)))
      .map((s) =>
        optionOf(
          String(s.id),
          s.designation ? `${s.displayName} — ${s.designation}` : s.displayName,
        ),
      )
  }, [incharges, addParent, root])

  const [zoom, setZoom] = useState(1)
  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, Math.round(z * 10) / 10))
  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta * 0.1))

  // Scroll the canvas so the first root node is horizontally centered in the
  // viewport, regardless of screen size.
  const canvasRef = useRef<HTMLDivElement>(null)
  const centerRoot = () => {
    const el = canvasRef.current
    if (!el) return
    const rootEl = el.querySelector<HTMLElement>('[data-hierarchy-root]')
    if (!rootEl) {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
      el.scrollTop = 0
      return
    }
    const canvas = el.getBoundingClientRect()
    const rootRect = rootEl.getBoundingClientRect()
    const rootCenterX = rootRect.left - canvas.left + el.scrollLeft + rootRect.width / 2
    const rootTop = rootRect.top - canvas.top + el.scrollTop
    el.scrollLeft = Math.max(0, rootCenterX - el.clientWidth / 2)
    el.scrollTop = Math.max(0, rootTop - 32)
  }
  const resetView = () => {
    setZoom(1)
    requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }
  useEffect(() => {
    if (root) requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }, [root])

  const handleAdd = (salesmanId: string) => {
    if (!addParent) return
    addReport.mutate(
      { id: Number(salesmanId), reportsTo: Number(addParent.id) },
      {
        onSuccess: () => {
          toast.success('Reporting updated', {
            description: `Now reports to ${addParent.name || 'the selected manager'}.`,
          })
          setAddParent(null)
        },
        onError: () =>
          toast.error('Unable to update reporting', {
            description: 'Please try again in a moment.',
          }),
      },
    )
  }

  const handleSetRoot = (salesmanId: string) => {
    setRoot.mutate(Number(salesmanId), {
      onSuccess: () => {
        toast.success('Top manager set', {
          description: 'This sales incharge is now at the top — everyone else reports under them.',
        })
        setRootPickerOpen(false)
      },
      onError: () =>
        toast.error('Unable to set the top manager', {
          description: 'Please try again in a moment.',
        }),
    })
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    const { node } = pendingRemove
    removeNode.mutate(Number(node.id), {
      onSuccess: (cleared) =>
        toast.success('Removed from the team chart', {
          description:
            cleared > 1
              ? `${node.name || 'This sales incharge'} and ${cleared - 1} team member${cleared - 1 === 1 ? '' : 's'} under them were removed.`
              : `${node.name || 'This sales incharge'} was removed.`,
        }),
      onError: () =>
        toast.error('Unable to remove from the team chart', {
          description: 'Please try again in a moment.',
        }),
    })
  }

  const removedName = pendingRemove?.node.name ?? ''

  return {
    root,
    isLoading,
    availableOptions,
    rootOptions,
    zoom,
    zoomBy,
    resetView,
    canvasRef,
    setRoot,
    addReport,
    removeNode,
    addParent,
    setAddParent,
    rootPickerOpen,
    setRootPickerOpen,
    pendingRemove,
    setPendingRemove,
    handleAdd,
    handleSetRoot,
    confirmRemove,
    removedName,
  }
}
