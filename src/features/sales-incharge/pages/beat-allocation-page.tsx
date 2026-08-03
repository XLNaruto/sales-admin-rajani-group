import {
  ArrowLeft,
  Hash,
  ListChecks,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { isForbiddenError } from "@/lib/api-error";
import { decryptParams } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { Forbidden } from "@/features/error";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { BeatAllocationPanel } from "../components/beat-allocation-panel";
import { useBeatAllocation } from "../hooks/use-beat-allocation";
import type { SalesInchargeStatus } from "../types";

interface BeatAllocationPageProps {
  /** Encrypted `?data=` token carrying the sales-incharge id to allocate for. */
  data?: string;
}

const STATUS_STYLES: Record<SalesInchargeStatus, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  suspended:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  inactive: "border-border bg-muted text-muted-foreground",
};

/**
 * One fact in the detail header, as an icon + value chip. Chips wrap and size to
 * their content (no reserved grid column), and a fact with no value renders
 * nothing at all rather than an empty placeholder.
 */
function HeaderChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <span
      title={`${label}: ${value}`}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </span>
  );
}

export function BeatAllocationPage({ data }: BeatAllocationPageProps) {
  // Decrypt the id from the URL token; missing/malformed → empty (no queries).
  const id = data
    ? String(decryptParams<{ id?: string | number }>(data)?.id ?? "")
    : "";

  const {
    goBack,
    incharge,
    hasSelection,
    detail,
    available,
    allocated,
    listError,
    addBeat,
    removeBeat,
    pendingRemove,
    setPendingRemove,
    confirmRemoveBeat,
    isRemoving,
    pendingId,
    isMutating,
  } = useBeatAllocation(id || undefined);

  // A forbidden beat-list load means no access to allocation — show the
  // dedicated Access-denied screen instead of the panels.
  if (isForbiddenError(listError)) return <Forbidden />;

  return (
    <div>
      <PageHeader
        title="Beat Allocation"
        description="Allocate beats to this sales incharge — add from the available list, remove from the allocated one."
        actions={
          <Button variant="outline" className="cursor-pointer" onClick={goBack}>
            <ArrowLeft /> Back to list
          </Button>
        }
      />

      {/* Sales incharge header — the name itself is the incharge picker. */}
      <div className="mb-6 rounded-xl border border-border/50 bg-card p-4 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        <div className="flex items-center gap-4">
          {detail.data?.profilePhotoUrl ? (
            <img
              src={detail.data.profilePhotoUrl}
              alt={detail.data.displayName}
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <UserRound className="size-5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Combobox
                variant="inline"
                withAvatars
                placeholder="Select sales incharge"
                searchPlaceholder="Search sales incharge…"
                value={incharge.value}
                onChange={incharge.onChange}
                options={incharge.options}
                loading={incharge.loading}
                onScrollEnd={incharge.onScrollEnd}
                onSearchChange={incharge.onSearchChange}
              />
              {detail.data && (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      STATUS_STYLES[detail.data.status],
                    )}
                  >
                    {detail.data.status.charAt(0).toUpperCase() +
                      detail.data.status.slice(1)}
                  </Badge>
                  {detail.data.designation && (
                    <Badge variant="outline" className="font-medium">
                      {detail.data.designation}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {!hasSelection && !incharge.loading && incharge.options.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No sales incharge found to allocate beats for.
              </p>
            ) : !hasSelection || detail.isLoading ? (
              <div className="mt-2 flex items-center gap-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-48 rounded-full" />
              </div>
            ) : detail.isError || !detail.data ? (
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                Couldn't load this sales incharge. Pick another one above.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HeaderChip
                  icon={Phone}
                  label="Mobile"
                  value={detail.data.phone}
                />
                <HeaderChip
                  icon={Mail}
                  label="Email"
                  value={detail.data.email}
                />
                <HeaderChip
                  icon={Hash}
                  label="Employee code"
                  value={detail.data.employeeCode}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two panels: available beats (Add) · allocated beats (Remove) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BeatAllocationPanel
          title="Beat List"
          icon={ListChecks}
          accent="bg-blue-600/10 text-blue-600 dark:text-blue-400"
          rows={available.rows}
          rowCount={available.rowCount}
          isLoading={available.isLoading}
          isError={available.isError}
          search={available.search}
          onSearchChange={available.setSearch}
          searchPlaceholder="Search available beats…"
          refresh={available.refresh}
          onLoadMore={available.onLoadMore}
          hasMore={available.hasMore}
          isFetchingMore={available.isFetchingMore}
          pagination={available.pagination}
          onPaginationChange={(updater) =>
            available.setPagination(
              typeof updater === "function"
                ? updater(available.pagination)
                : updater,
            )
          }
          action={{
            label: "Add",
            icon: Plus,
            className:
              "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
            onClick: addBeat,
          }}
          pendingId={pendingId}
          actionsDisabled={isMutating}
          emptyLabel="No beats available to allocate."
        />

        <BeatAllocationPanel
          title="Allocated Beats"
          icon={ListChecks}
          accent="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
          rows={allocated.rows}
          rowCount={allocated.rowCount}
          isLoading={allocated.isLoading}
          isError={allocated.isError}
          search={allocated.search}
          onSearchChange={allocated.setSearch}
          searchPlaceholder="Search allocated beats…"
          refresh={allocated.refresh}
          pagination={allocated.pagination}
          onPaginationChange={(updater) =>
            allocated.setPagination(
              typeof updater === "function"
                ? updater(allocated.pagination)
                : updater,
            )
          }
          action={{
            label: "Remove",
            icon: Trash2,
            className:
              "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
            onClick: removeBeat,
          }}
          pendingId={pendingId}
          actionsDisabled={isMutating}
          emptyLabel="No beats allocated yet."
        />
      </div>

      {/* Removing an allocated beat is confirmed first. */}
      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        variant="destructive"
        icon={Trash2}
        title="Remove this beat?"
        description={
          pendingRemove ? (
            <>
              <span className="font-medium text-foreground">
                {pendingRemove.beatName}
              </span>{" "}
              will no longer be allocated to{" "}
              {detail.data?.displayName ?? "this sales incharge"}.
            </>
          ) : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveBeat}
        loading={isRemoving}
        keepOpenOnConfirm
      />
    </div>
  );
}
