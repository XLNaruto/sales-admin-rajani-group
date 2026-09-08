import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { encryptParams } from "@/lib/crypto";
import { toastMutationError } from "@/lib/api-toast";
import { useFormDraft } from "@/hooks/use-form-drafts";
import {
  useCreateSalesIncharge,
  useSalesIncharge,
  useUpdateSalesIncharge,
} from "../api/use-sales-incharge";
import {
  salesInchargeSchema,
  salesInchargeDefaults,
  SALES_INCHARGE_DRAFT_KEY,
  SALES_INCHARGE_FILE_FIELDS,
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

/** Parse a 'yyyy-MM-dd' form value into a local Date (or undefined when blank),
 *  for use as a date-picker bound. */
const toDate = (v?: string) => {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};

/**
 * Owns the sales-incharge form for both create and edit. In edit mode (`id`
 * set) it loads the record via GET, seeds the form, and submits via PUT —
 * uploading any newly-picked photos and preserving untouched images plus the
 * server-managed fields the form doesn't edit. Create mode POSTs a fresh record.
 * The page consumes this and only lays out fields.
 *
 * Create mode also autosaves to a local draft on every field blur, so an
 * abandoned form can be resumed from the list screen's Drafts picker
 * (`draftId`). The draft is dropped once the record is actually created.
 */
export function useSalesInchargeForm(id?: string, draftId?: string) {
  const navigate = useNavigate();
  const isEdit = !!id;

  const createSalesIncharge = useCreateSalesIncharge();
  const updateSalesIncharge = useUpdateSalesIncharge();
  const detail = useSalesIncharge(id);

  const form = useForm<SalesInchargeFormValues>({
    resolver: zodResolver(salesInchargeSchema),
    mode: "onTouched",
    defaultValues: salesInchargeDefaults as SalesInchargeFormValues,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  // Local draft autosave — create mode only; an existing record is already
  // server-backed. A brand-new draft's id is pushed into the URL so a reload
  // keeps writing to the same one instead of spawning duplicates.
  const { saveOnBlur, clearDraft, isRestoring } = useFormDraft({
    form,
    formKey: SALES_INCHARGE_DRAFT_KEY,
    draftId,
    enabled: !isEdit,
    fileFields: SALES_INCHARGE_FILE_FIELDS,
    describe: (values) => ({
      label: values.name?.trim() || "Untitled sales incharge",
      summary: [values.mobile, values.email].filter(Boolean).join(" · "),
    }),
    onCreated: (newDraftId) =>
      navigate({
        to: "/sales-incharge/create",
        search: { data: encryptParams({ draftId: newDraftId }) },
        replace: true,
      }),
  });

  // Date-of-birth drives the lower bound of the anniversary / joining / exit
  // pickers, so watch it and re-derive the bound as it changes.
  const birthDate = toDate(watch("dateOfBirth"));

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
      // Only once the record exists — a failed request must keep the draft.
      clearDraft();
      toast.success(`${values.name} ${isEdit ? "updated" : "added to the sales team"}`);
      navigate({ to: "/sales-incharge" });
    };
    // A 409 is a business-rule conflict the user can fix — most commonly
    // SALES_INCHARGE_EMAIL_TAKEN — so the API's own message is shown verbatim.
    const onError = (error: unknown) =>
      toastMutationError(
        error,
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

  /** Swap the form over to another saved draft (from the in-page picker). */
  const openDraft = (nextDraftId: string) =>
    navigate({
      to: "/sales-incharge/create",
      search: { data: encryptParams({ draftId: nextDraftId }) },
    });

  /**
   * Abandon the draft in front of us and start clean. The route doesn't remount
   * on a same-path navigation, so the form is reset by hand; dropping `data`
   * from the URL is what tells `useFormDraft` to mint a fresh draft id on the
   * next blur, leaving the old draft untouched in the list.
   */
  const startNewDraft = () => {
    reset(salesInchargeDefaults as SalesInchargeFormValues);
    navigate({ to: "/sales-incharge/create", search: {} });
  };

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
    /** Why the record wouldn't load — shown under the failure message. */
    error: detail.error,
    goBack,
    openDraft,
    startNewDraft,
    /** The draft this form is writing to, if any — flagged in the picker. */
    draftId,
    /** Blur handler for the `<form>` — snapshots the values into the draft. */
    saveOnBlur,
    /** True while a draft is being resumed (`?data=` carried a draft id). */
    isRestoring,
    currentYear: new Date().getFullYear(),
    maxBirthDate: MAX_BIRTH_DATE,
    /** Today — latest selectable date, so future dates can't be picked. */
    today: new Date(),
    /** Selected date of birth as a Date — lower bound for later date fields. */
    birthDate,
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
