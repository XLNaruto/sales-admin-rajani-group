import { ArrowLeft, ListChecks, Plus, Trash2, UserRound } from "lucide-react";
import { decryptParams } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/** A compact labelled fact in the detail header. */
function HeaderFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value || "N/A"}
      </dd>
    </div>
  );
}

export function BeatAllocationPage({ data }: BeatAllocationPageProps) {
  // Decrypt the id from the URL token; missing/malformed → empty (no queries).
  const id = data
    ? String(decryptParams<{ id?: string | number }>(data)?.id ?? "")
    : "";

  const {
    goBack,
    detail,
    available,
    allocated,
    addBeat,
    removeBeat,
    pendingId,
    isMutating,
  } = useBeatAllocation(id || undefined);

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

      {/* Sales incharge detail header */}
      <div className="mb-6 rounded-xl border border-border/50 bg-card p-5 shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent">
        {detail.isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        ) : detail.isError || !detail.data ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Couldn't load this sales incharge. Please go back and try again.
          </p>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {detail.data.profilePhotoUrl ? (
                <img
                  src={detail.data.profilePhotoUrl}
                  alt={detail.data.displayName}
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">
                  {detail.data.displayName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
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
                </div>
              </div>
            </div>

            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 sm:border-l sm:border-border sm:pl-6 lg:grid-cols-4">
              <HeaderFact
                label="Employee Code"
                value={detail.data.employeeCode}
              />
              <HeaderFact label="Mobile" value={detail.data.phone} />
              <HeaderFact label="Territory" value={detail.data.territory} />
              <HeaderFact label="Email" value={detail.data.email} />
            </dl>
          </div>
        )}
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
    </div>
  );
}
