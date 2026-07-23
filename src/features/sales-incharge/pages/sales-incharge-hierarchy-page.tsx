import { Loader2, Minus, Network, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Hint } from '@/components/common/hint'
import { isForbiddenError } from '@/lib/api-error'
import { Forbidden } from '@/features/error'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '../components/form-fields'
import { HierarchyTree } from '../components/hierarchy-tree'
import { PanCanvas } from '../components/pan-canvas'
import { useSalesInchargeHierarchyView } from '../hooks/use-sales-incharge-hierarchy'
import type { HierarchyLevel } from '../lib/hierarchy'

export function SalesInchargeHierarchyPage() {
  const {
    root,
    isLoading,
    isError,
    error,
    zoom,
    zoomBy,
    resetView,
    canvasRef,
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
    geoOptions,
    geoLoading,
    assignee,
    submitting,
    handleAdd,
    handleEdit,
    closeDialog,
    confirmDialog,
    pendingRemove,
    setPendingRemove,
    confirmRemove,
    removing,
  } = useSalesInchargeHierarchyView()

  const canSubmit =
    !!newDesignationId && !!newAssigneeId && (!geoSource || !!newGeoId) && !submitting

  // A forbidden tree load means no access to this module — show the dedicated
  // Access-denied screen instead of the canvas. (Initial-load 403s are caught
  // by the route loader; this covers a 403 on a later refetch.)
  if (isForbiddenError(error)) return <Forbidden />

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col">
      <PageHeader
        title="Sales Incharge Hierarchy"
        description="Build the organisation's designation structure across levels — from National down to City."
      />

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
        {/* Dotted-grid backdrop (behind the canvas), like a design surface. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[22px_22px]"
        />

        {isLoading ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <span className="relative grid size-12 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Loader2 className="size-6 animate-spin" />
                </span>
              </span>
              <p className="text-sm font-medium">Loading hierarchy…</p>
            </div>
          </div>
        ) : isError ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-destructive">
            Failed to load the hierarchy. Please try again.
          </div>
        ) : root ? (
          <>
            <PanCanvas
              ref={canvasRef}
              zoom={zoom}
              onZoomDelta={zoomBy}
              className="h-full w-full"
            >
              <HierarchyTree
                root={root}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onRemove={(node, isRoot) => setPendingRemove({ node, isRoot })}
              />
            </PanCanvas>

            {/* Zoom controls */}
            <div
              data-nopan
              className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-md backdrop-blur"
            >
              <Hint label="Zoom out">
                <button
                  type="button"
                  onClick={() => zoomBy(-1)}
                  disabled={zoom <= 0.5}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
              </Hint>
              <button
                type="button"
                title="Reset zoom"
                onClick={resetView}
                className="min-w-12 cursor-pointer rounded-lg px-2 py-1.5 text-center text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-accent"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Hint label="Zoom in">
                <button
                  type="button"
                  onClick={() => zoomBy(1)}
                  disabled={zoom >= 2}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </Hint>
              <span className="mx-0.5 h-5 w-px bg-border" />
              <Hint label="Reset view">
                <button
                  type="button"
                  onClick={resetView}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                </button>
              </Hint>
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center p-8">
            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Network className="size-7" />
              </span>
              <div>
                <p className="font-medium text-foreground">No root exists yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The hierarchy root is created from the{' '}
                  <span className="font-medium text-foreground">Super Admin</span> panel. Once it
                  exists, you can build the structure beneath it here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / edit dialog: pick the designation, geography and assignee for a
          node — nested below the selected node (add) or updated in place (edit).
          The level is chosen on add and fixed on edit. */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && !submitting && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit structure level' : 'Add structure level'}
            </DialogTitle>
            {isEditMode && editNode ? (
              <DialogDescription>
                Editing{' '}
                <span className="font-medium text-foreground">{editNode.designation}</span>{' '}
                <span className="text-muted-foreground">({editNode.level})</span>. The level can't
                be changed.
              </DialogDescription>
            ) : addParent ? (
              <DialogDescription>
                Nesting under{' '}
                <span className="font-medium text-foreground">{addParent.designation}</span>{' '}
                <span className="text-muted-foreground">({addParent.level})</span>. Only levels below{' '}
                <span className="font-medium text-foreground">{addParent.level}</span> can be added.
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Level is only selectable when adding; an existing node's is fixed. */}
            {!isEditMode && (
              <Field label="Level">
                <Combobox
                  value={newLevel}
                  onChange={(v) => changeLevel(v as HierarchyLevel)}
                  options={allowedLevels.map((level) => ({ value: level, label: level }))}
                  placeholder="Select level"
                  searchable={false}
                />
              </Field>
            )}

            <Field label="Designation">
              <Combobox
                value={newDesignationId}
                onChange={setNewDesignationId}
                options={designationSelect.options}
                loading={designationSelect.loading}
                onScrollEnd={designationSelect.onScrollEnd}
                onSearchChange={designationSelect.onSearchChange}
                placeholder="Select designation"
                searchPlaceholder="Search designations…"
              />
            </Field>

            {/* Geographic entity — the master matching the level (State, Zone,
                District, City). National has no geography, so it's hidden. */}
            {geoSource && (
              <Field label={geoSource.label}>
                <Combobox
                  value={newGeoId}
                  onChange={setNewGeoId}
                  options={geoOptions}
                  loading={geoLoading}
                  placeholder={`Select ${geoSource.label.toLowerCase()}`}
                  searchPlaceholder={`Search ${geoSource.label.toLowerCase()}…`}
                />
              </Field>
            )}

            {/* Assignee — Sales Incharge for a City node, Sales Incharge Admin
                for every level above. */}
            <Field label={assignee.label}>
              <Combobox
                value={newAssigneeId}
                onChange={setNewAssigneeId}
                options={assignee.options}
                loading={assignee.loading}
                placeholder={`Select ${assignee.label.toLowerCase()}`}
                searchPlaceholder={`Search ${assignee.label.toLowerCase()}…`}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirmDialog} disabled={!canSubmit} className="gap-2">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditMode ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {isEditMode ? 'Save changes' : 'Add level'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        variant="destructive"
        icon={Trash2}
        title="Remove from the structure?"
        description={
          pendingRemove ? (
            <>
              <span className="font-medium text-foreground">
                {pendingRemove.node.designation || 'This entry'}
              </span>{' '}
              and everything nested under it will be removed. An administrator can reverse this.
            </>
          ) : undefined
        }
        confirmLabel="Yes, remove"
        cancelLabel="Cancel"
        loading={removing}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
