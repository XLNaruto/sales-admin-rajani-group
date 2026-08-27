import { useMemo, useState } from "react";
import {
  Cake,
  Heart,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Hint } from "@/components/common/hint";
import { Field, DatePicker } from "@/features/beat-creation";
import { cn } from "@/lib/utils";
import {
  distributorOwnerSchema,
  type DistributorOwnerValues,
} from "../lib/distributor-form";

/** Latest allowed birth date — today shifted back 18 years, so anyone younger
 *  than 18 can't be selected. */
const MAX_BIRTH_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();

/** Today — the latest selectable date, so future anniversaries can't be picked. */
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();

const EMPTY_DRAFT: DistributorOwnerValues = {
  name: "",
  mobile: "",
  email: "",
  birthDate: "",
  anniversaryDate: "",
};

/** Per-field messages for the draft partner being added/edited. */
type DraftErrors = Partial<Record<keyof DistributorOwnerValues, string>>;

/** Parse a 'yyyy-MM-dd' value into a local Date (undefined when blank). */
const toDate = (v?: string) => {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};

/** 'yyyy-MM-dd' → 'dd/MM/yyyy' for the read-only table cells. */
const formatDate = (v?: string) => {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return y && m && d ? `${d}/${m}/${y}` : v;
};

/** Up to two initials from a partner's name, for the summary chips. */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Digits-only input guard, capped at `max` characters. */
const digitsOnly =
  (max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, max);
  };

interface OwnerPartnersDialogProps {
  onClose: () => void;
  value: DistributorOwnerValues[];
  onChange: (owners: DistributorOwnerValues[]) => void;
  /** Index to pre-load into the draft form (chip "edit" shortcut), or null. */
  editIndex: number | null;
}

/**
 * "Owners / Partners" manager. Every owner or partner of the firm is captured
 * here — the API replaces its whole `owners` list on each save, so the list this
 * dialog produces is always the complete one.
 *
 * Each add/update/remove commits straight to the form value (there's no separate
 * save step); "Done" only closes the modal.
 *
 * Mounted only while open, so the draft form starts clean every time — except
 * when opened from a chip's edit shortcut, which seeds that partner.
 */
function OwnerPartnersDialog({
  onClose,
  value,
  onChange,
  editIndex,
}: OwnerPartnersDialogProps) {
  const [draft, setDraft] = useState<DistributorOwnerValues>(
    () => (editIndex !== null ? value[editIndex] : undefined) ?? EMPTY_DRAFT,
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  // Index being edited in place, or null while adding a new partner.
  const [editing, setEditing] = useState<number | null>(editIndex);

  const patch = (p: Partial<DistributorOwnerValues>) => {
    setDraft((d) => ({ ...d, ...p }));
    // Clear the touched field's error as soon as it's edited.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(p) as (keyof DistributorOwnerValues)[])
        delete next[k];
      return next;
    });
  };

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setEditing(null);
  };

  /** Validate the draft and either append it or replace the entry being edited. */
  const commitDraft = () => {
    const parsed = distributorOwnerSchema.safeParse(draft);
    if (!parsed.success) {
      const next: DraftErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DistributorOwnerValues | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    // One mobile number per partner — it's how the firm's logins are keyed.
    const clash = value.some(
      (o, i) => i !== editing && o.mobile === parsed.data.mobile,
    );
    if (clash) {
      setErrors({ mobile: "This mobile number is already added" });
      return;
    }
    if (value.length >= 20 && editing === null) {
      setErrors({ name: "At most 20 owners / partners can be added" });
      return;
    }
    onChange(
      editing === null
        ? [...value, parsed.data]
        : value.map((o, i) => (i === editing ? parsed.data : o)),
    );
    resetDraft();
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    // Removing the row currently loaded in the draft form drops the edit.
    if (editing === index) resetDraft();
    else if (editing !== null && index < editing) setEditing(editing - 1);
  };

  const isEditing = editing !== null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        onClose={onClose}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </span>
            <DialogTitle>Owners / Partners</DialogTitle>
          </div>
          <DialogDescription>
            Add every owner or partner of this firm. Details are saved with the
            distributor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ------------------------- Draft partner ------------------------ */}
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-sm font-semibold text-foreground">
              {isEditing ? `Edit Partner ${editing + 1}` : "Add Partner"}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Owner's / Partner Name" error={errors.name}>
                <Input
                  placeholder="Owner's / Partner Name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>

              <Field
                label="Owner's / Partner Mobile Number"
                error={errors.mobile}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={draft.mobile}
                  onChange={(e) => {
                    digitsOnly(10)(e);
                    patch({ mobile: e.target.value });
                  }}
                />
              </Field>

              <Field label="E-mail Id" error={errors.email}>
                <Input
                  type="email"
                  placeholder="E-mail Id"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>

              <Field
                label="Birth Date"
                hint="Used for birthday greetings."
                error={errors.birthDate}
              >
                <DatePicker
                  value={draft.birthDate}
                  onChange={(v) => patch({ birthDate: v })}
                  fromYear={1940}
                  toYear={CURRENT_YEAR}
                  maxDate={MAX_BIRTH_DATE}
                />
              </Field>

              <Field
                label="Marriage Anniversary Date"
                optional
                error={errors.anniversaryDate}
              >
                <DatePicker
                  value={draft.anniversaryDate ?? ""}
                  onChange={(v) => patch({ anniversaryDate: v })}
                  fromYear={1960}
                  toYear={CURRENT_YEAR}
                  minDate={toDate(draft.birthDate)}
                  maxDate={TODAY}
                />
              </Field>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={resetDraft}
                >
                  Cancel edit
                </Button>
              ) : null}
              <Button
                type="button"
                className="cursor-pointer text-white"
                onClick={commitDraft}
              >
                <Plus /> {isEditing ? "Update Partner" : "Add Partner"}
              </Button>
            </div>
          </div>

          {/* ------------------------ Added partners ------------------------ */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Added Partners
              </p>
              <Badge variant="outline" className="font-medium tabular-nums">
                {value.length}
              </Badge>
            </div>

            {value.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No partners added yet. Fill in the details above and choose
                &ldquo;Add Partner&rdquo;.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                      <TableHead className="min-w-56">Name</TableHead>
                      <TableHead className="min-w-40">Mobile</TableHead>
                      <TableHead className="min-w-64">E-mail</TableHead>
                      <TableHead className="min-w-36">Birth Date</TableHead>
                      <TableHead className="min-w-36">Anniversary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {value.map((owner, index) => (
                      <TableRow
                        key={`${owner.mobile}-${index}`}
                        className={cn(editing === index && "bg-accent/40")}
                      >
                        <TableCell className="tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Hint label="Edit">
                              <button
                                type="button"
                                aria-label={`Edit ${owner.name}`}
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                onClick={() => {
                                  setEditing(index);
                                  setDraft(owner);
                                  setErrors({});
                                }}
                              >
                                <Pencil className="size-4" />
                              </button>
                            </Hint>
                            <Hint label="Remove">
                              <button
                                type="button"
                                aria-label={`Remove ${owner.name}`}
                                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </Hint>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {owner.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {owner.mobile ? (
                            <span className="flex items-center gap-1.5 tabular-nums">
                              <Phone className="size-3.5 text-muted-foreground" />
                              {owner.mobile}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {owner.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3.5 text-muted-foreground" />
                              {owner.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(owner.birthDate) ? (
                            <span className="flex items-center gap-1.5 tabular-nums">
                              <Cake className="size-3.5 text-muted-foreground" />
                              {formatDate(owner.birthDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(owner.anniversaryDate) ? (
                            <span className="flex items-center gap-1.5 tabular-nums">
                              <Heart className="size-3.5 text-muted-foreground" />
                              {formatDate(owner.anniversaryDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            type="button"
            className="cursor-pointer text-white"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OwnerPartnersFieldProps {
  value: DistributorOwnerValues[];
  onChange: (owners: DistributorOwnerValues[]) => void;
  /** Validation message from the form (e.g. "Add at least one owner / partner"). */
  error?: string;
}

/**
 * Form control for the distributor's `owners` list: a summary card with a chip
 * per partner, backed by the {@link OwnerPartnersDialog} manager. Plugs into
 * react-hook-form through a `Controller` on the `owners` field.
 */
export function OwnerPartnersField({
  value,
  onChange,
  error,
}: OwnerPartnersFieldProps) {
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const summary = useMemo(
    () => value.map((o) => o.name).join(", "),
    [value],
  );

  const openManager = (index: number | null = null) => {
    setEditIndex(index);
    setOpen(true);
  };

  return (
    <Field label="Owners / Partners" error={error} className="col-span-full">
      <div className="rounded-xl border border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Users className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {value.length === 0
                  ? "No partners added"
                  : `${value.length} ${value.length === 1 ? "partner" : "partners"} added`}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {summary || "Add every owner or partner of this firm."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => openManager()}
          >
            <Plus /> Manage Partners
          </Button>
        </div>

        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 p-3">
            {value.map((owner, index) => (
              <span
                key={`${owner.mobile}-${index}`}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-accent/40 py-1 pl-1 pr-2 text-sm"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600/10 text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                  {initials(owner.name)}
                </span>
                <span className="max-w-40 truncate text-foreground">
                  {owner.name}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {owner.mobile}
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${owner.name}`}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => openManager(index)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${owner.name}`}
                  className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <OwnerPartnersDialog
          onClose={() => {
            setOpen(false);
            setEditIndex(null);
          }}
          value={value}
          onChange={onChange}
          editIndex={editIndex}
        />
      ) : null}
    </Field>
  );
}
