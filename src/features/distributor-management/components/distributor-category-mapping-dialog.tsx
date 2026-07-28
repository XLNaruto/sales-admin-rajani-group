import { useEffect, useMemo, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, MultiSelect } from "@/features/beat-creation";
import { errorStatus, getApiErrorMessage } from "@/lib/api-error";
import {
  useProductDivisions,
  useUpdateDistributorProductDivisions,
} from "../api/use-distributors";
import type { Distributor } from "../types";

interface DistributorCategoryMappingDialogProps {
  /** The distributor whose product divisions are being mapped; null closes the dialog. */
  distributor: Distributor | null;
  onClose: () => void;
}

/** Same ids, order-insensitive — used to keep Save disabled until something changes. */
function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((v) => set.has(v));
}

/**
 * Category mapping (Product Division) modal.
 *
 * Loads the product-division master, pre-selects what the distributor already
 * handles, and PATCHes the complete new set to
 * …/distributors/{id}/product-divisions. The endpoint replaces the whole
 * selection, so clearing every option is a valid save that unmaps the firm.
 */
export function DistributorCategoryMappingDialog({
  distributor,
  onClose,
}: DistributorCategoryMappingDialogProps) {
  const open = distributor !== null;
  const productDivisions = useProductDivisions();
  const update = useUpdateDistributorProductDivisions();

  // `MultiSelect` is string-keyed, so ids are carried as strings throughout and
  // converted back to numbers in the API layer.
  const options = useMemo(
    () =>
      (productDivisions.data?.items ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [productDivisions.data],
  );

  // What the row says is currently mapped. The list endpoint returns the ids;
  // older rows that only carry names are matched back through the master list.
  const current = useMemo(() => {
    if (!distributor) return [];
    if (distributor.productDivisionIds?.length)
      return distributor.productDivisionIds;
    const names = new Set(distributor.productDivisionNames ?? []);
    return options.filter((o) => names.has(o.label)).map((o) => o.value);
  }, [distributor, options]);

  const [selected, setSelected] = useState<string[]>([]);

  // Seed (and re-seed) the selection each time the dialog opens or the master
  // list resolves.
  useEffect(() => {
    setSelected(current);
  }, [current]);

  const canSave = !update.isPending && !sameSet(selected, current);

  const save = () => {
    if (!distributor || !canSave) return;
    update.mutate(
      { id: distributor.id, productDivisionIds: selected },
      {
        onSuccess: () => {
          toast.success(
            selected.length
              ? `Category mapping updated for ${distributor.firmName}`
              : `Category mapping cleared for ${distributor.firmName}`,
          );
          onClose();
        },
        onError: (error) => {
          // A 404 means the distributor (or a division) has gone away since the
          // row was listed — worth surfacing the server's reason.
          if (errorStatus(error) === 404 || errorStatus(error) === 400) {
            toast.error("Couldn't update the category mapping", {
              description: getApiErrorMessage(error),
            });
            return;
          }
          toast.error("Couldn't update the category mapping.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Layers className="size-5" />
            </span>
            <DialogTitle>Category Mapping</DialogTitle>
          </div>
          <DialogDescription>
            {distributor ? (
              <>
                Map product divisions for{" "}
                <span className="font-medium text-foreground">
                  {distributor.firmName}
                </span>
                .
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <Field
            label="Product Division"
            optional
            hint="Saving replaces the current mapping. Clear every division to unmap the firm."
          >
            <MultiSelect
              value={selected}
              onChange={setSelected}
              options={options}
              placeholder={
                productDivisions.isLoading
                  ? "Loading…"
                  : "Select product divisions…"
              }
              searchPlaceholder="Search division"
            />
          </Field>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={onClose}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={save}
            disabled={!canSave}
          >
            {update.isPending ? <Loader2 className="animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
