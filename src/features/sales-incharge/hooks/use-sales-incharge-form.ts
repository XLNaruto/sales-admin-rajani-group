import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useCreateSalesIncharge,
  useSalesIncharge,
  useUpdateSalesIncharge,
} from "../api/use-sales-incharge";
import {
  salesInchargeSchema,
  salesInchargeDefaults,
  type SalesInchargeFormValues,
} from "../lib/incharge-form";
import type {
  SalesInchargeExistingFiles,
  SalesInchargePreservedFields,
} from "../types";

/** Image fields that can carry an already-saved storage path in edit mode. */
export type ExistingImageField = "profile" | "aadharFront" | "aadharBack";

/** Per-field storage path of the photos already saved on the record. */
export type ExistingImages = Record<ExistingImageField, string>;

const EMPTY_EXISTING: ExistingImages = {
  profile: "",
  aadharFront: "",
  aadharBack: "",
};

/** Latest allowed birth date — today shifted back 18 years, so anyone younger
 *  than 18 can't be selected. */
const MAX_BIRTH_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();

/**
 * Owns the sales-incharge form for both create and edit. In edit mode (`id`
 * set) it loads the record via GET, seeds the form, and submits via PUT —
 * uploading any newly-picked photos and preserving untouched images plus the
 * server-managed fields the form doesn't edit. Create mode POSTs a fresh record.
 * The page consumes this and only lays out fields.
 */
export function useSalesInchargeForm(id?: string) {
  const navigate = useNavigate();
  const isEdit = !!id;

  const createSalesIncharge = useCreateSalesIncharge();
  const updateSalesIncharge = useUpdateSalesIncharge();
  const detail = useSalesIncharge(id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalesInchargeFormValues>({
    resolver: zodResolver(salesInchargeSchema),
    mode: "onTouched",
    defaultValues: salesInchargeDefaults as SalesInchargeFormValues,
  });

  // Photos already saved on the record — shown as previews and retained on
  // update unless the user removes them or picks a replacement. Server-managed
  // fields the form doesn't edit are round-tripped on save.
  const [existingImages, setExistingImages] =
    useState<ExistingImages>(EMPTY_EXISTING);
  const [preserved, setPreserved] =
    useState<SalesInchargePreservedFields | null>(null);

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values);
      setExistingImages({
        profile: detail.data.existing.profilePhotoPath,
        aadharFront: detail.data.existing.aadharFrontPhotoPath,
        aadharBack: detail.data.existing.aadharBackPhotoPath,
      });
      setPreserved(detail.data.preserved);
    }
  }, [detail.data, reset]);

  /** Drop one already-saved photo so the update no longer retains it. */
  const removeExistingImage = (field: ExistingImageField) =>
    setExistingImages((prev) => ({ ...prev, [field]: "" }));

  const onSubmit = handleSubmit((values) => {
    const onSuccess = () => {
      toast.success(`${values.name} ${isEdit ? "updated" : "added to the sales team"}`);
      navigate({ to: "/sales-incharge" });
    };
    const onError = () =>
      toast.error(
        `Couldn't ${isEdit ? "update" : "create"} the sales incharge. Please try again.`,
      );

    if (isEdit && id) {
      const existing: SalesInchargeExistingFiles = {
        profilePhotoPath: existingImages.profile,
        aadharFrontPhotoPath: existingImages.aadharFront,
        aadharBackPhotoPath: existingImages.aadharBack,
      };
      updateSalesIncharge.mutate(
        { id, values, existing, preserved: preserved ?? EMPTY_PRESERVED },
        { onSuccess, onError },
      );
    } else {
      createSalesIncharge.mutate(values, { onSuccess, onError });
    }
  });

  const goBack = () => navigate({ to: "/sales-incharge" });

  return {
    register,
    control,
    errors,
    existingImages,
    removeExistingImage,
    onSubmit,
    isEdit,
    isPending: createSalesIncharge.isPending || updateSalesIncharge.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && detail.isError,
    goBack,
    currentYear: new Date().getFullYear(),
    maxBirthDate: MAX_BIRTH_DATE,
    /** Seeded designation label (edit mode) so its option shows before its
     *  page loads in the lazy dropdown. */
    designationName: detail.data?.designationName ?? null,
  };
}

const EMPTY_PRESERVED: SalesInchargePreservedFields = {
  status: "active",
  employeeCode: null,
  designationId: null,
  reportsTo: null,
  territory: null,
  salary: null,
};
