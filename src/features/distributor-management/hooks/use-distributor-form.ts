import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { errorStatus, getApiErrorMessage } from "@/lib/api-error";
import { encryptParams } from "@/lib/crypto";
import { useFormDraft } from "@/hooks/use-form-drafts";
import {
  useCreateDistributor,
  useDistributor,
  useUpdateDistributor,
} from "../api/use-distributors";
import {
  distributorSchema,
  distributorDefaults,
  DISTRIBUTOR_DRAFT_KEY,
  DISTRIBUTOR_FILE_FIELDS,
  type DistributorFormValues,
} from "../lib/distributor-form";
import type { GeoLabels } from "@/features/location";
import type {
  DistributorCreateInput,
  DistributorExistingFiles,
} from "../types";

/** Image fields that can carry already-saved storage paths in edit mode. */
export type ExistingImageField = "office" | "godown" | "pan" | "gst" | "cheque";

/** Per-field arrays of the paths already saved on the record (display + edit). */
export type ExistingImages = Record<ExistingImageField, string[]>;

const EMPTY_EXISTING: ExistingImages = {
  office: [],
  godown: [],
  pan: [],
  gst: [],
  cheque: [],
};

/** Split a comma-joined path string into a clean array. */
const splitPaths = (s?: string) =>
  s
    ? s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

/** Normalise the API's existing-file record into per-field path arrays. */
const toExistingImages = (e: DistributorExistingFiles): ExistingImages => ({
  office: e.officeImagePaths,
  godown: e.godownImagePaths,
  pan: splitPaths(e.panCardPhotoPath),
  gst: splitPaths(e.gstPhotoPath),
  cheque: splitPaths(e.advanceChequePhotoPath),
});

/** Collapse per-field path arrays back into the update payload's shape. */
const fromExistingImages = (e: ExistingImages): DistributorExistingFiles => ({
  officeImagePaths: e.office,
  godownImagePaths: e.godown,
  panCardPhotoPath: e.pan.join(","),
  gstPhotoPath: e.gst.join(","),
  advanceChequePhotoPath: e.cheque.join(","),
});

/** Parse an optional numeric-text field into a number (or undefined when blank). */
const num = (v?: string) => (v && v.trim() !== "" ? Number(v) : undefined);
/** Trim an optional text field, collapsing blanks to undefined. */
const str = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);
/**
 * An unset optional dropdown holds `""` (the Combobox's empty value) — the API
 * wants the key omitted instead, so collapse it back to `undefined`.
 */
const optValue = <T extends string>(v?: T): Exclude<T, ""> | undefined =>
  (v || undefined) as Exclude<T, ""> | undefined;

/**
 * On an invalid submit, bring the topmost errored field into view and focus its
 * control. Targets the `[data-error]` message the shared `Field` renders, so it
 * works for native inputs and custom controls (Combobox/DatePicker) alike.
 */
function scrollToFirstError() {
  requestAnimationFrame(() => {
    const message = document.querySelector<HTMLElement>("[data-error]");
    if (!message) return;
    message.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus the field's control if it's natively focusable (won't steal the
    // smooth scroll thanks to `preventScroll`).
    const control = message.parentElement?.querySelector<HTMLElement>(
      "input, textarea, select, button, [tabindex]",
    );
    control?.focus({ preventScroll: true });
  });
}

/** Map validated form values into the create/update request payload. */
function toInput(values: DistributorFormValues): DistributorCreateInput {
  return {
    // Firm & owner
    firmName: values.firmName,
    firmType: values.firmType,
    owners: values.owners.map((o) => ({
      name: o.name.trim(),
      mobile: o.mobile,
      email: str(o.email),
      birthDate: str(o.birthDate),
      anniversaryDate: str(o.anniversaryDate),
    })),
    communicationMobile: str(values.communicationMobile),
    multipleLogin: optValue(values.multipleLogin),
    email: values.email,
    code: values.code ?? "",
    status: values.status,
    companyIds: values.companyIds ?? [],
    // Location & coverage
    officeAddress: values.officeAddress,
    godownAddress: str(values.godownAddress),
    homeAddress: str(values.homeAddress),
    stateId: values.stateId,
    zoneId: values.zoneId,
    districtId: values.districtId,
    talukaId: values.talukaId,
    cityId: values.cityId,
    pincode: str(values.pincode),
    deliveryRouteId: num(values.deliveryRouteId),
    deliveryRouteDay: optValue(values.deliveryRouteDay),
    agencyTalukaIds: values.agencyTalukaIds ?? [],
    marketType: optValue(values.marketType),
    villageIds: values.villageIds ?? [],
    retailersLocal: num(values.retailersLocal),
    retailersRural: num(values.retailersRural),
    marketSystem: optValue(values.marketSystem),
    weeklyOff: str(values.weeklyOff),
    geoLocation: str(values.geoLocation),
    officeImages: values.officeImages ?? [],
    godownImages: values.godownImages ?? [],
    // Business details
    otherAgencies: str(values.otherAgencies),
    similarAgencies: str(values.similarAgencies),
    assignedProducts: str(values.assignedProducts),
    productTargets: str(values.productTargets),
    deliveryVehicle: optValue(values.deliveryVehicle),
    deliveryVehicleDetail: str(values.deliveryVehicleDetail),
    godownSize: num(values.godownSize),
    yearOfEst: str(values.yearOfEst),
    // Legal & financial
    panNumber: str(values.panNumber),
    panPhoto: values.panPhoto ?? [],
    gstNumber: str(values.gstNumber),
    gstPhoto: values.gstPhoto ?? [],
    advanceChequeNumbers: str(values.advanceChequeNumbers),
    advanceChequePhoto: values.advanceChequePhoto ?? [],
    paymentConditionId: num(values.paymentConditionId),
    bankAccountName: str(values.bankAccountName),
    bankAccountNumber: str(values.bankAccountNumber),
    bankIfsc: str(values.bankIfsc),
    bankName: str(values.bankName),
  };
}

/**
 * Owns the distributor form for both create and edit. In edit mode (`id` set)
 * it loads the record via GET, seeds the form, and submits via PATCH — merging
 * newly-picked files with the paths already saved so untouched images survive.
 * Create mode POSTs a fresh record. The page consumes this and only lays out
 * fields.
 *
 * Create mode also autosaves to a local draft on every field blur, so an
 * abandoned onboarding can be resumed from the list screen's Drafts picker
 * (`draftId`). The draft is dropped once the record is actually created.
 */
export function useDistributorForm(id?: string, draftId?: string) {
  const navigate = useNavigate();
  const isEdit = !!id;

  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const detail = useDistributor(id);

  const form = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
    mode: "onTouched",
    defaultValues: distributorDefaults as DistributorFormValues,
    // We scroll/focus the first error ourselves (see `scrollToFirstError`) so
    // custom controls (Combobox/DatePicker/MultiSelect) are handled too.
    shouldFocusError: false,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  // Local draft autosave — create mode only; an existing record is already
  // server-backed. A brand-new draft's id is pushed into the URL so a reload
  // keeps writing to the same one instead of spawning duplicates.
  const { saveOnBlur, clearDraft, isRestoring } = useFormDraft({
    form,
    formKey: DISTRIBUTOR_DRAFT_KEY,
    draftId,
    enabled: !isEdit,
    fileFields: DISTRIBUTOR_FILE_FIELDS,
    describe: (values) => ({
      label: values.firmName?.trim() || "Untitled distributor",
      summary: [values.owners?.[0]?.name, values.owners?.[0]?.mobile, values.email]
        .filter(Boolean)
        .join(" · "),
    }),
    onCreated: (newDraftId) =>
      navigate({
        to: "/distributors/create",
        search: { data: encryptParams({ draftId: newDraftId }) },
        replace: true,
      }),
  });

  // Paths already saved on the record — shown as thumbnails and retained on
  // update so leaving an image field untouched doesn't wipe the existing files.
  // Reactive so removing one re-renders and drops it from the update payload.
  const [existingImages, setExistingImages] =
    useState<ExistingImages>(EMPTY_EXISTING);

  // Names for the currently-held geography ids. The five selects are lazy and
  // parent-scoped, so an id can be set before its own option has been fetched —
  // these keep the right name in the trigger meanwhile. Seeded from the record
  // in edit mode, and rewritten by the page when a city back-fills its ancestry.
  const [geoLabels, setGeoLabels] = useState<GeoLabels>({});

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values);
      setExistingImages(toExistingImages(detail.data.existing));
      setGeoLabels(detail.data.geoLabels);
    }
  }, [detail.data, reset]);

  /** Drop one already-saved image so the update no longer retains it. */
  const removeExistingImage = (field: ExistingImageField, index: number) =>
    setExistingImages((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));

  // Cascading territory selection — watch parents to build child options.
  const stateId = watch("stateId");
  const zoneId = watch("zoneId");
  const districtId = watch("districtId");
  const talukaId = watch("talukaId");
  const cityId = watch("cityId");

  const onSubmit = handleSubmit(
    (values) => {
      const input = toInput(values);
      const onSuccess = () => {
        // Only once the record exists — a failed request must keep the draft.
        clearDraft();
        toast.success(`${values.firmName} ${isEdit ? "updated" : "created"}`);
        navigate({ to: "/distributors" });
      };
      // A 409 is a business-rule conflict the user can act on — most commonly
      // DISTRIBUTOR_CODE_TAKEN — so surface the API's own message verbatim
      // instead of the generic retry copy.
      const onError = (error: unknown) =>
        toast.error(
          errorStatus(error) === 409
            ? getApiErrorMessage(error)
            : `Couldn't ${isEdit ? "update" : "create"} the distributor. Please try again.`,
        );

      if (isEdit && id) {
        updateDistributor.mutate(
          { ...input, id, existing: fromExistingImages(existingImages) },
          { onSuccess, onError },
        );
      } else {
        createDistributor.mutate(input, { onSuccess, onError });
      }
    },
    // Invalid submit — bring the first errored field into view and focus it.
    scrollToFirstError,
  );

  const goBack = () => navigate({ to: "/distributors" });

  /** Swap the form over to another saved draft (from the in-page picker). */
  const openDraft = (nextDraftId: string) =>
    navigate({
      to: "/distributors/create",
      search: { data: encryptParams({ draftId: nextDraftId }) },
    });

  /**
   * Abandon the draft in front of us and start clean. The route doesn't remount
   * on a same-path navigation, so the form is reset by hand; dropping `data`
   * from the URL is what tells `useFormDraft` to mint a fresh draft id on the
   * next blur, leaving the old draft untouched in the list.
   */
  const startNewDraft = () => {
    reset(distributorDefaults as DistributorFormValues);
    setGeoLabels({});
    navigate({ to: "/distributors/create", search: {} });
  };

  return {
    register,
    control,
    errors,
    setValue,
    existingImages,
    removeExistingImage,
    geoLabels,
    setGeoLabels,
    stateId,
    zoneId,
    districtId,
    talukaId,
    cityId,
    onSubmit,
    isEdit,
    isPending: createDistributor.isPending || updateDistributor.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && detail.isError,
    goBack,
    openDraft,
    startNewDraft,
    /** The draft this form is writing to, if any — flagged in the picker. */
    draftId,
    /** Blur handler for the `<form>` — snapshots the values into the draft. */
    saveOnBlur,
    /** True while a draft is being resumed (`?data=` carried a draft id). */
    isRestoring,
  };
}
