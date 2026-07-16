import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useSalesIncharges } from '@/features/sales-incharge'
import { subtreeIds, useAddReport, useHierarchy, useRemoveNode } from '../api/use-hierarchy'
import type { HierarchyNode } from '../types'

/**
 * Orchestrates the salesman-hierarchy canvas: the hierarchy query (multi-root)
 * + the sales-incharge list that feeds the picker, the pan/zoom + centering
 * behaviour, the picker/confirm dialog state and the reporting-manager /
 * clear-hierarchy mutations. The page consumes this and only renders.
 */
export function useSalesmanHierarchy() {
  const { roots, isLoading } = useHierarchy()
  const addReport = useAddReport()
  const removeNode = useRemoveNode()

  // The salesman pool for the "add report" picker comes from the live
  // sales-incharge list (active incharges), not a mock array.
  const { data: list } = useSalesIncharges({
    status: 'active',
    pageSize: 100,
    sortBy: 'display_name',
    sortOrder: 'asc',
  })
  const incharges = list?.items

  const [addParent, setAddParent] = useState<HierarchyNode | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{
    node: HierarchyNode
    isRoot: boolean
  } | null>(null)

  // Placing a salesman under `addParent` may draw from anyone except the
  // parent's own subtree (that would create a cycle — the server rejects it too).
  const availableOptions = useMemo<ComboboxOption[]>(() => {
    if (!addParent) return []
    const excluded = subtreeIds(addParent)
    return (incharges ?? [])
      .filter((s) => !excluded.has(String(s.id)))
      .map((s) => ({
        value: String(s.id),
        label: s.designation ? `${s.displayName} — ${s.designation}` : s.displayName,
      }))
  }, [incharges, addParent])

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
    if (roots.length) requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }, [roots])

  const handleAdd = (salesmanId: string) => {
    if (!addParent) return
    addReport.mutate(
      { id: Number(salesmanId), reportsTo: Number(addParent.id) },
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
    const { node } = pendingRemove
    removeNode.mutate(Number(node.id), {
      onSuccess: (cleared) =>
        toast.success(
          cleared > 1
            ? `Detached ${cleared} people from the hierarchy`
            : 'Detached from hierarchy',
        ),
      onError: () => toast.error("Couldn't detach the node."),
    })
  }

  const removedName = pendingRemove?.node.name ?? ''

  return {
    roots,
    isLoading,
    availableOptions,
    zoom,
    zoomBy,
    resetView,
    canvasRef,
    addReport,
    removeNode,
    addParent,
    setAddParent,
    pendingRemove,
    setPendingRemove,
    handleAdd,
    confirmRemove,
    removedName,
  }
}
