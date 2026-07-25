import { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
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
import { useProductDivisions } from "../api/use-distributors";
import type { Distributor } from "../types";

interface DistributorCategoryMappingDialogProps {
  /** The distributor whose product divisions are being mapped; null closes the dialog. */
  distributor: Distributor | null;
  onClose: () => void;
}

/**
 * Category mapping (Product Division) modal.
 *
 * Design + dropdown wiring only — it loads the product-division master via the
 * list API and pre-selects the distributor's current divisions. The save/update
 * mutation is provided separately; `onSave` is a placeholder for now.
 */
export function DistributorCategoryMappingDialog({
  distributor,
  onClose,
}: DistributorCategoryMappingDialogProps) {
  const open = distributor !== null;
  const productDivisions = useProductDivisions();

  const options = useMemo(
    () =>
      (productDivisions.data?.items ?? []).map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [productDivisions.data],
  );

  const [selected, setSelected] = useState<string[]>([]);

  // Seed the selection from the distributor's current divisions each time the
  // dialog opens or the master list resolves. Only names are available on the
  // row, so match them back to option values by label.
  useEffect(() => {
    if (!distributor) return;
    const names = new Set(distributor.productDivisionNames ?? []);
    setSelected(options.filter((o) => names.has(o.label)).map((o) => o.value));
  }, [distributor, options]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <span className="grid size-10 place-items-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Layers className="size-5" />
          </span>
          <DialogTitle>Category Mapping</DialogTitle>
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
          <Field label="Product Division" optional>
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
          >
            Cancel
          </Button>
          {/* TODO: wire the update mutation (edit/update provided later). */}
          <Button type="button" className="cursor-pointer" disabled>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
