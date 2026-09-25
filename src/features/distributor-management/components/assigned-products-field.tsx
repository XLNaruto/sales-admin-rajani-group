import { useEffect, useRef } from "react";
import {
  Controller,
  useController,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Hint } from "@/components/common/hint";
import { Field } from "@/features/beat-creation";
import { useMainCategoryOptions } from "@/features/master-management";
import { useCompanyStore } from "@/stores/company-store";
import {
  EMPTY_ASSIGNED_PRODUCT,
  type DistributorFormValues,
} from "../lib/distributor-form";

interface AssignedProductsFieldProps {
  control: Control<DistributorFormValues>;
  errors: FieldErrors<DistributorFormValues>;
  /**
   * Names of the categories already saved on the record (edit mode), keyed by
   * id — shown in a row's trigger when its category isn't among the options
   * (e.g. it belongs to a company other than the one currently selected).
   */
  savedNames?: Record<string, string>;
}

/**
 * The distributor's "Assigned Products": repeatable rows of a main category and
 * a target quantity (units). Every fetched main category is offered; picking one
 * whose company isn't ticked in the form's Company field ticks it, since the API
 * rejects a category of an unselected company. A category can be picked in one
 * row only. Un-ticking a company drops the rows whose category belongs to it.
 */
export function AssignedProductsField({
  control,
  errors,
  savedNames = {},
}: AssignedProductsFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "assignedProducts",
  });
  const {
    field: { value: watchedCompanyIds, onChange: setCompanyIds },
  } = useController({ control, name: "companyIds" });
  const companyIds = watchedCompanyIds ?? [];
  const rows = useWatch({ control, name: "assignedProducts" }) ?? [];
  const { all, isLoading } = useMainCategoryOptions(companyIds);
  const selectedCompanyName = useCompanyStore((s) => s.selectedCompanyName);

  /** Pick a category for a row, ticking its company when it isn't yet. */
  const pickCategory = (categoryId: string, onChange: (v: string) => void) => {
    onChange(categoryId);
    const companyId = all.find((c) => String(c.id) === categoryId)?.companyId;
    if (companyId == null || companyIds.includes(String(companyId))) return;
    setCompanyIds([...companyIds, String(companyId)]);
    toast.info(`${selectedCompanyName ?? "The category's company"} added to Company`);
  };

  // Un-ticking a company → remove the rows whose category belongs to it. Only
  // reacts to a company actually leaving the selection, so seeding the form
  // (companies go from none to some) never touches the rows.
  const previousCompanies = useRef<string[]>(companyIds);
  useEffect(() => {
    const before = previousCompanies.current;
    previousCompanies.current = companyIds;
    const dropped = before.filter((id) => !companyIds.includes(id));
    if (dropped.length === 0) return;

    const companyOf = new Map(all.map((c) => [String(c.id), c.companyId]));
    const stale = rows
      .map((row, index) => ({ index, companyId: companyOf.get(row.categoryId) }))
      .filter((r) => r.companyId != null && dropped.includes(String(r.companyId)))
      .map((r) => r.index);
    if (stale.length === 0) return;

    remove(stale);
    toast.info(
      `Removed ${stale.length} assigned ${stale.length === 1 ? "product" : "products"} of the un-ticked company`,
    );
    // `rows` / `all` are read at the moment the company changes — re-running
    // when they change on their own would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyIds.join(","), remove]);

  const listError =
    errors.assignedProducts?.message ?? errors.assignedProducts?.root?.message;

  const hint = selectedCompanyName
    ? `Main categories of ${selectedCompanyName} (the selected company).`
    : undefined;

  // Why the picker has nothing to offer, shown in place of its placeholder.
  const blockedReason =
    !isLoading && all.length === 0 ? "No active main categories" : null;

  return (
    <Field
      label="Assigned Products"
      optional
      error={listError}
      hint={hint}
      className="col-span-full"
    >
      <div className="rounded-xl border border-border/60">
        {fields.length === 0 ? (
          <div className="flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Package className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              No products assigned. Add a main category and its target
              quantity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {fields.map((item, index) => {
              const rowErrors = errors.assignedProducts?.[index];
              // Categories picked in other rows are left out — each at most once.
              const takenElsewhere = new Set(
                rows.filter((_, i) => i !== index).map((r) => r.categoryId),
              );
              const rowOptions = all
                .filter((c) => !takenElsewhere.has(String(c.id)))
                .map((c) => ({ value: String(c.id), label: c.name }));
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 items-start gap-4 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
                >
                  <Field
                    label="Main Category"
                    error={rowErrors?.categoryId?.message}
                  >
                    <Controller
                      control={control}
                      name={`assignedProducts.${index}.categoryId`}
                      render={({ field }) => (
                        <Combobox
                          value={field.value ?? ""}
                          onChange={(v) => pickCategory(v, field.onChange)}
                          options={rowOptions}
                          loading={isLoading}
                          placeholder={
                            blockedReason ??
                            (isLoading ? "Loading…" : "Select main category")
                          }
                          // Nothing to pick — but a saved value stays visible.
                          disabled={!!blockedReason && !field.value}
                          searchPlaceholder="Search category"
                          fallbackLabel={
                            savedNames[field.value] ??
                            (field.value ? `Category #${field.value}` : undefined)
                          }
                        />
                      )}
                    />
                  </Field>

                  <Field
                    label="Target Quantity"
                    error={rowErrors?.targetQuantity?.message}
                  >
                    <Controller
                      control={control}
                      name={`assignedProducts.${index}.targetQuantity`}
                      render={({ field }) => (
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Units, e.g. 1200"
                          name={field.name}
                          ref={field.ref}
                          value={field.value ?? ""}
                          onBlur={field.onBlur}
                          // Whole units only — strip anything but digits.
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/\D/g, ""))
                          }
                        />
                      )}
                    />
                  </Field>

                  <Hint label="Remove">
                    <button
                      type="button"
                      aria-label={`Remove product ${index + 1}`}
                      className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:mt-7"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Hint>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end border-t border-border/60 p-3">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={
              !!blockedReason ||
              (!isLoading && rows.length >= all.length)
            }
            // No auto-focus: it would land on Target Quantity (the Combobox takes
            // no ref), and opening the category picker would then blur it and
            // flag the still-empty quantity before the user got to it.
            onClick={() =>
              append({ ...EMPTY_ASSIGNED_PRODUCT }, { shouldFocus: false })
            }
          >
            <Plus /> Add product
          </Button>
        </div>
      </div>
    </Field>
  );
}
