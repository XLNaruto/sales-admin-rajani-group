import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import {
  useCreateHierarchyEntry,
  useDeleteHierarchyEntry,
  useGeoOptions,
  useHierarchyTree,
  useSalesInchargeAdminOptions,
  useUpdateHierarchyEntry,
} from '../api/use-hierarchy'
import { useSalesIncharges } from '../api/use-sales-incharge'
import { useDesignationSelect } from './use-designation-select'
import type { PanCanvasHandle } from '../components/pan-canvas'
import {
  findNode,
  GEO_SOURCE,
  HIERARCHY_LEVELS,
  levelRank,
  type AssigneeRole,
  type HierarchyLevel,
  type StructureNode,
} from '../lib/hierarchy'

/** `add` nests under `parentId` (null → the National root); `edit` updates in place. */
type DialogState =
  | { mode: 'add'; parentId: string | null }
  | { mode: 'edit'; nodeId: string }
  | null

/**
 * Orchestrates the org-hierarchy canvas: the tree query, the add/edit dialog
 * (level → designation → geography → assignee), the delete confirm, the
 * create/update/delete mutations and the pan/zoom + centering behaviour. The
 * page consumes this and only renders.
 */
export function useSalesInchargeHierarchyView() {
  const { data: root = null, isLoading, isError, error } = useHierarchyTree()

  const createEntry = useCreateHierarchyEntry()
  const updateEntry = useUpdateHierarchyEntry()
  const deleteEntry = useDeleteHierarchyEntry()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [newLevel, setNewLevel] = useState<HierarchyLevel>(HIERARCHY_LEVELS[0])
  const [newDesignationId, setNewDesignationId] = useState('')
  const [newGeoId, setNewGeoId] = useState('')
  const [newAssigneeId, setNewAssigneeId] = useState('')
  const [pendingRemove, setPendingRemove] = useState<{
    node: StructureNode
    isRoot: boolean
  } | null>(null)

  const dialogOpen = !!dialog
  const isEditMode = dialog?.mode === 'edit'
  // A City node is staffed by a Sales Incharge; any higher level by an Admin.
  const isCityLevel = newLevel === 'City'
  const geoSource = GEO_SOURCE[newLevel]

  // ── Option sources — each fetched lazily, only while the dialog is open. ──
  const designationSelect = useDesignationSelect()

  const geoQuery = useGeoOptions(newLevel, dialogOpen && !!geoSource)

  const salesInchargeQuery = useSalesIncharges(
    { status: 'active', pageSize: 100, sortBy: 'display_name', sortOrder: 'asc' },
    { enabled: dialogOpen && isCityLevel },
  )
  const salesInchargeOptions = useMemo<ComboboxOption[]>(
    () =>
      (salesInchargeQuery.data?.items ?? []).map((s) => ({
        value: String(s.id),
        label: s.displayName,
      })),
    [salesInchargeQuery.data],
  )
  const adminQuery = useSalesInchargeAdminOptions(dialogOpen && !isCityLevel)

  // The assignee select adapts to the chosen level: label, master and options
  // all switch on `isCityLevel`.
  const assignee = useMemo(
    () =>
      isCityLevel
        ? {
            role: 'sales-incharge' as AssigneeRole,
            label: 'Sales Incharge',
            options: salesInchargeOptions,
            loading: salesInchargeQuery.isFetching,
          }
        : {
            role: 'sales-incharge-admin' as AssigneeRole,
            label: 'Sales Incharge Admin',
            options: adminQuery.data ?? [],
            loading: adminQuery.isFetching,
          },
    [
      isCityLevel,
      salesInchargeOptions,
      salesInchargeQuery.isFetching,
      adminQuery.data,
      adminQuery.isFetching,
    ],
  )

  // ── Dialog context: which node we're nesting under / editing, and the levels
  // valid there (a child must sit deeper than its parent). The root itself is
  // provisioned from the Super Admin panel, so it's never created/edited here. ──
  const addParent =
    dialog?.mode === 'add' && dialog.parentId && root ? findNode(root, dialog.parentId) : null
  const editNode = dialog?.mode === 'edit' && root ? findNode(root, dialog.nodeId) : null
  const allowedLevels = addParent
    ? HIERARCHY_LEVELS.filter((l) => levelRank(l) > levelRank(addParent.level))
    : HIERARCHY_LEVELS

  const resetFields = (level: HierarchyLevel) => {
    setNewLevel(level)
    setNewDesignationId('')
    setNewGeoId('')
    setNewAssigneeId('')
  }

  // Open the add dialog under `node`, pre-selecting the first valid child level.
  const handleAdd = useCallback((node: StructureNode) => {
    const firstAllowed = HIERARCHY_LEVELS.filter((l) => levelRank(l) > levelRank(node.level))[0]
    setDialog({ mode: 'add', parentId: node.id })
    resetFields(firstAllowed ?? HIERARCHY_LEVELS[0])
  }, [])

  // Open the edit dialog for an existing node, prefilling its values. The level
  // is fixed to the node's own (its geography can't move it to another level).
  const handleEdit = useCallback((node: StructureNode) => {
    setDialog({ mode: 'edit', nodeId: node.id })
    setNewLevel(node.level)
    setNewDesignationId(node.designationId ?? '')
    setNewGeoId(node.geoId ?? '')
    setNewAssigneeId(node.assigneeId ?? '')
  }, [])

  const closeDialog = () => setDialog(null)

  // Changing the level swaps the geo + assignee masters, so the previously
  // picked entity/assignee no longer apply — clear them.
  const changeLevel = (level: HierarchyLevel) => {
    setNewLevel(level)
    setNewGeoId('')
    setNewAssigneeId('')
  }

  const submitting = createEntry.isPending || updateEntry.isPending

  // Save the dialog — POST to add or PATCH to update — then refetch the tree.
  const confirmDialog = () => {
    if (!dialog) return
    if (dialog.mode === 'add' && !addParent) return
    if (dialog.mode === 'add' && addParent && levelRank(newLevel) <= levelRank(addParent.level))
      return
    if (dialog.mode === 'edit' && !editNode) return
    if (!newDesignationId || !newAssigneeId || (geoSource && !newGeoId)) return

    const input = {
      level: newLevel,
      designationId: Number(newDesignationId),
      geoId: geoSource ? Number(newGeoId) : null,
      assigneeId: Number(newAssigneeId),
      isCityLevel,
    }

    if (dialog.mode === 'add') {
      createEntry.mutate(
        { parentId: dialog.parentId != null ? Number(dialog.parentId) : null, input },
        {
          onSuccess: () => {
            toast.success('Hierarchy entry added')
            closeDialog()
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add entry'),
        },
      )
    } else {
      updateEntry.mutate(
        { id: dialog.nodeId, input },
        {
          onSuccess: () => {
            toast.success('Hierarchy entry updated')
            closeDialog()
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update entry'),
        },
      )
    }
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    const { node } = pendingRemove
    deleteEntry.mutate(node.id, {
      onSuccess: () =>
        toast.success('Removed from the structure', {
          description: `"${node.designation || 'Entry'}" and everything under it were removed.`,
        }),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove entry'),
    })
  }

  // ── Pan / zoom ──
  const [zoom, setZoom] = useState(1)
  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, Math.round(z * 10) / 10))
  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta * 0.1))

  const canvasRef = useRef<PanCanvasHandle>(null)
  const centerRoot = () => canvasRef.current?.center()
  const resetView = () => {
    setZoom(1)
    requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }
  useEffect(() => {
    if (root) requestAnimationFrame(() => requestAnimationFrame(centerRoot))
  }, [root])

  return {
    root,
    isLoading,
    isError,
    error,
    // canvas
    zoom,
    zoomBy,
    resetView,
    canvasRef,
    // dialog
    dialog,
    dialogOpen,
    isEditMode,
    addParent,
    editNode,
    allowedLevels,
    geoSource,
    newLevel,
    newDesignationId,
    setNewDesignationId,
    newGeoId,
    setNewGeoId,
    newAssigneeId,
    setNewAssigneeId,
    changeLevel,
    designationSelect,
    geoOptions: geoQuery.data ?? [],
    geoLoading: geoQuery.isFetching,
    assignee,
    submitting,
    handleAdd,
    handleEdit,
    closeDialog,
    confirmDialog,
    // delete
    pendingRemove,
    setPendingRemove,
    confirmRemove,
    removing: deleteEntry.isPending,
  }
}
