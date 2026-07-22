import { format, parseISO } from "date-fns";
import { UserRound, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSalesInchargeDetail } from "../api/use-sales-incharge";
import type { SalesInchargeStatus } from "../types";

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return "N/A";
  try {
    return format(parseISO(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
}

/** Format a numeric money string as '₹ 1,234' (falls back to the raw value). */
function formatMoney(value: string | null) {
  if (value == null || value.trim() === "") return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `₹ ${n.toLocaleString("en-IN")}`;
}

const STATUS_STYLES: Record<SalesInchargeStatus, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  invited:
    "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  suspended:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  inactive: "border-border bg-muted text-muted-foreground",
};

/** A labelled read-only field. Spans both columns when `wide`. */
function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">
        {value ?? "N/A"}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-6 border-b border-border pb-2 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  );
}

interface Props {
  /** The sales-incharge id to show; `null` closes the dialog. */
  id: number | null;
  onClose: () => void;
}

/**
 * Read-only "view details" modal for a single sales incharge. Fetches the full
 * record on open and lays it out in labelled sections (profile, contact,
 * employment, compensation, bank, documents).
 */
export function SalesInchargeDetailDialog({ id, onClose }: Props) {
  const open = id !== null;
  const { data, isLoading, isError, error } = useSalesInchargeDetail(
    id != null ? String(id) : undefined,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showClose={false}
        className="flex max-h-[85vh] max-w-2xl flex-col p-0"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-2">
            <DialogTitle>Sales Incharge Details</DialogTitle>
            <DialogDescription>
              Full profile and onboarding details.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {error instanceof Error
              ? error.message
              : "Couldn't load this sales incharge."}
          </p>
        ) : data ? (
          <div>
            {/* Profile header */}
            <div className="flex items-center gap-4">
              {data.profilePhotoUrl ? (
                <img
                  src={data.profilePhotoUrl}
                  alt={data.displayName}
                  className="size-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-7" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">
                  {data.displayName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("font-medium", STATUS_STYLES[data.status])}
                  >
                    {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                  </Badge>
                  {data.designation && (
                    <Badge variant="outline" className="font-medium">
                      {data.designation}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <SectionTitle>Employment</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Employee Code" value={data.employeeCode} />
              <Field label="Territory" value={data.territory} />
              <Field
                label="Date Of Joining"
                value={formatDate(data.dateOfJoining)}
              />
              <Field label="Date Of Exit" value={formatDate(data.dateOfExit)} />
            </dl>

            <SectionTitle>Contact</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Mobile" value={data.phone} />
              <Field label="Alternate Mobile" value={data.alternatePhone} />
              <Field label="Email" value={data.email} wide />
              <Field label="Address" value={data.address} wide />
              <Field
                label="Date Of Birth"
                value={formatDate(data.dateOfBirth)}
              />
              <Field
                label="Marriage Anniversary"
                value={formatDate(data.marriageAnniversary)}
              />
            </dl>

            <SectionTitle>Compensation</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Basic Salary" value={formatMoney(data.basicSalary)} />
              <Field label="Allowance" value={formatMoney(data.allowance)} />
            </dl>

            <SectionTitle>Bank</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Account Name" value={data.bankAccountName} />
              <Field label="Account Number" value={data.bankAccountNumber} />
              <Field label="IFSC" value={data.bankIfsc} />
              <Field label="Bank Name" value={data.bankName} />
            </dl>

            <SectionTitle>Documents</SectionTitle>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Aadhar Number" value={data.aadharNumber} wide />
            </dl>
            {(data.aadharFrontUrl || data.aadharBackUrl) && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {data.aadharFrontUrl && (
                  <a
                    href={data.aadharFrontUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Aadhar Front
                    </span>
                    <img
                      src={data.aadharFrontUrl}
                      alt="Aadhar front"
                      className="h-28 w-full rounded-lg border border-border object-cover"
                    />
                  </a>
                )}
                {data.aadharBackUrl && (
                  <a
                    href={data.aadharBackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Aadhar Back
                    </span>
                    <img
                      src={data.aadharBackUrl}
                      alt="Aadhar back"
                      className="h-28 w-full rounded-lg border border-border object-cover"
                    />
                  </a>
                )}
              </div>
            )}
          </div>
        ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
