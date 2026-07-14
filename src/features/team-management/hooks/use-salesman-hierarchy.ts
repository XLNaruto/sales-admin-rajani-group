import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useSalesmen } from '@/features/sales-incharge'
import {
  useAddNode,
  useHierarchy,
  useRemoveNode,
  useSetRoot,
  usedSalesmanIds,
} from '../api/use-hierarchy'
import type { HierarchyNode } from '../types'

/**
 * Orchestrates the salesman-hierarchy canvas: the hierarchy + salesmen queries,
 * the pan/zoom + centering behaviour, the picker/confirm dialog state and the
 * add/remove/set-root mutations. The page consumes this and only renders.
 */
export function useSalesmanHierarchy() {
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

  // Scroll the canvas so the root node (top-center of the tree) is horizontally
  // centered in the viewport, regardless of screen size.
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
    // Center the scroll on the root card's actual position — robust to the
    // canvas padding and any asymmetry in the tree beneath it.
    const canvas = el.getBoundingClientRect()
    const rootRect = rootEl.getBoundingClientRect()
    const rootCenterX = rootRect.left - canvas.left + el.scrollLeft + rootRect.width / 2
    const rootTop = rootRect.top - canvas.top + el.scrollTop
    el.scrollLeft = Math.max(0, rootCenterX - el.clientWidth / 2)
    el.scrollTop = Math.max(0, rootTop - 32)
  }
  // Reset zoom to 100% and re-center the root.
  const resetView = () => {
    setZoom(1)
    // Wait for the zoom change to lay out before measuring scroll extents.
    requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }
  // Center once the tree is first rendered.
  useEffect(() => {
    if (root) requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }, [root])

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

  return {
    root,
    isLoading,
    salesmenById,
    availableOptions,
    zoom,
    zoomBy,
    resetView,
    canvasRef,
    setRoot,
    addNode,
    removeNode,
    rootPickerOpen,
    setRootPickerOpen,
    addParent,
    setAddParent,
    pendingRemove,
    setPendingRemove,
    handleSetRoot,
    handleAdd,
    confirmRemove,
    removedName,
  }
}
