import { format, parseISO } from "date-fns";
import { Building2, X } from "lucide-react";
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
import { useDistributorDetail } from "../api/use-distributors";
import {
  cityName,
  labelFor,
  stateName,
  talukaName,
} from "../lib/distributor-reference";
import type { DistributorStatus } from "../types";

/** Format a 'yyyy-MM-dd' string as 'dd-MM-yyyy' (falls back to the raw value). */
function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
}

const STATUS_STYLES: Record<DistributorStatus, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended:
    "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  rejected:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
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
        {value ?? "—"}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-6 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  );
}

/** A labelled block of clickable image thumbnails (opens full-size in a new tab). */
function ImageGrid({ label, urls }: { label: string; urls: string[] }) {
  const shown = urls.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
            <img
              src={url}
              alt={label}
              className="h-24 w-full rounded-lg border border-border object-cover"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

interface Props {
  /** The distributor id to show; `null` closes the dialog. */
  id: string | null;
  onClose: () => void;
}

/**
 * Read-only "view details" modal for a single distributor. Fetches the full
 * record on open and lays it out in labelled sections (firm & owner, location,
 * business, legal & financial, documents).
 */
export function DistributorDetailDialog({ id, onClose }: Props) {
  const open = id !== null;
  const { data, isLoading, isError, error } = useDistributorDetail(id ?? undefined);

  const yesNo = (v: boolean | null) => (v == null ? "—" : v ? "Yes" : "No");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showClose={false}
        className="flex max-h-[85vh] max-w-2xl flex-col p-0"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-2">
            <DialogTitle>Distributor Details</DialogTitle>
            <DialogDescription>
              Full firm, coverage, business and financial details.
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
                : "Couldn't load this distributor."}
            </p>
          ) : data ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Building2 className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">
                    {data.firmName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("font-medium", STATUS_STYLES[data.status])}
                    >
                      {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                    </Badge>
                    {data.code && (
                      <Badge variant="outline" className="font-medium">
                        {data.code}
                      </Badge>
                    )}
                    {data.firmType && (
                      <Badge variant="outline" className="font-medium">
                        {labelFor(data.firmType)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <SectionTitle>Firm &amp; Owner</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Legal Name" value={data.legalName} />
                <Field label="Owner Name" value={data.ownerName} />
                <Field label="Owner Mobile" value={data.ownerMobile} />
                <Field
                  label="Communication Mobile"
                  value={data.communicationMobile}
                />
                <Field label="Email" value={data.email} wide />
                <Field
                  label="Owner Birth Date"
                  value={formatDate(data.ownerBirthDate)}
                />
                <Field
                  label="Owner Anniversary"
                  value={formatDate(data.ownerAnniversaryDate)}
                />
                <Field
                  label="Multiple Login"
                  value={yesNo(data.multipleLogin)}
                />
              </dl>

              <SectionTitle>Location &amp; Coverage</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Office Address" value={data.officeAddress} wide />
                <Field label="Godown Address" value={data.godownAddress} wide />
                <Field label="Home Address" value={data.homeAddress} wide />
                <Field
                  label="State"
                  value={data.stateId ? stateName(data.stateId) : "—"}
                />
                <Field
                  label="City"
                  value={data.cityId ? cityName(data.cityId) : "—"}
                />
                <Field
                  label="Taluka"
                  value={data.talukaId ? talukaName(data.talukaId) : "—"}
                />
                <Field label="Pincode" value={data.pincode} />
                <Field label="Delivery Route" value={data.deliveryRoute} />
                <Field label="Weekly Off" value={data.weeklyOff} />
                <Field
                  label="Market Type"
                  value={labelFor(data.marketType ?? undefined)}
                />
                <Field
                  label="Market System"
                  value={labelFor(data.marketSystem ?? undefined)}
                />
                <Field label="Retailers (Local)" value={data.retailersLocal} />
                <Field label="Retailers (Rural)" value={data.retailersRural} />
                <Field label="Geo Location" value={data.geoLocation} wide />
              </dl>
              {(data.officeImageUrls.length > 0 ||
                data.godownImageUrls.length > 0) && (
                <div className="mt-4 space-y-4">
                  <ImageGrid label="Office Images" urls={data.officeImageUrls} />
                  <ImageGrid label="Godown Images" urls={data.godownImageUrls} />
                </div>
              )}

              <SectionTitle>Business Details</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Other Agencies" value={data.otherAgencies} wide />
                <Field
                  label="Similar Category Agencies"
                  value={data.similarAgencies}
                  wide
                />
                <Field
                  label="Assigned Products"
                  value={data.assignedProducts}
                  wide
                />
                <Field
                  label="Target Per Product"
                  value={data.productTargets}
                  wide
                />
                <Field
                  label="Delivery Vehicle"
                  value={yesNo(data.deliveryVehicle)}
                />
                <Field
                  label="Vehicle Detail"
                  value={data.deliveryVehicleDetail}
                />
                <Field
                  label="Godown Size (sq.ft)"
                  value={data.godownSize}
                />
                <Field label="Year Established" value={data.yearOfEst} />
              </dl>

              <SectionTitle>Legal &amp; Financial</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="PAN Number" value={data.panNumber} />
                <Field label="GST Number" value={data.gstNumber} />
                <Field
                  label="Payment Condition"
                  value={labelFor(data.paymentCondition ?? undefined)}
                />
                <Field
                  label="Advance Cheque Numbers"
                  value={data.advanceChequeNumbers}
                />
                <Field label="Bank Account Name" value={data.bankAccountName} />
                <Field
                  label="Bank Account Number"
                  value={data.bankAccountNumber}
                />
                <Field label="IFSC" value={data.bankIfsc} />
                <Field label="Bank Name" value={data.bankName} />
              </dl>
              {(data.panPhotoUrl ||
                data.gstPhotoUrl ||
                data.advanceChequePhotoUrl) && (
                <div className="mt-4 space-y-4">
                  <ImageGrid
                    label="PAN Card"
                    urls={[data.panPhotoUrl]}
                  />
                  <ImageGrid label="GST Certificate" urls={[data.gstPhotoUrl]} />
                  <ImageGrid
                    label="Advance Cheque"
                    urls={[data.advanceChequePhotoUrl]}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
