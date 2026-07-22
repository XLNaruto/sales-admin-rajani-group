import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useCreateDistributor,
  useDistributor,
  useUpdateDistributor,
} from "../api/use-distributors";
import {
  distributorSchema,
  distributorDefaults,
  type DistributorFormValues,
} from "../lib/distributor-form";
import type {
  DistributorCreateInput,
  DistributorExistingFiles,
} from "../types";

const CURRENT_YEAR = new Date().getFullYear();

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

/** Latest allowed birth date — today shifted back 18 years, so anyone younger
 *  than 18 can't be selected. */
const MAX_BIRTH_DATE = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();

/** Parse an optional numeric-text field into a number (or undefined when blank). */
const num = (v?: string) => (v && v.trim() !== "" ? Number(v) : undefined);
/** Trim an optional text field, collapsing blanks to undefined. */
const str = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);

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
    ownerName: values.ownerName,
    ownerMobile: values.ownerMobile,
    ownerBirthDate: str(values.ownerBirthDate),
    ownerAnniversaryDate: str(values.ownerAnniversaryDate),
    communicationMobile: str(values.communicationMobile),
    multipleLogin: values.multipleLogin,
    email: values.email,
    code: values.code ?? "",
    status: values.status,
    productDivisions: values.productDivisions ?? [],
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
    deliveryRoute: str(values.deliveryRoute),
    agencyTalukaIds: values.agencyTalukaIds ?? [],
    marketType: values.marketType,
    villageIds: values.villageIds ?? [],
    retailersLocal: num(values.retailersLocal),
    retailersRural: num(values.retailersRural),
    marketSystem: values.marketSystem,
    weeklyOff: str(values.weeklyOff),
    geoLocation: str(values.geoLocation),
    officeImages: values.officeImages ?? [],
    godownImages: values.godownImages ?? [],
    // Business details
    otherAgencies: str(values.otherAgencies),
    similarAgencies: str(values.similarAgencies),
    assignedProducts: str(values.assignedProducts),
    productTargets: str(values.productTargets),
    deliveryVehicle: values.deliveryVehicle,
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
    paymentCondition: values.paymentCondition,
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
 */
export function useDistributorForm(id?: string) {
  const navigate = useNavigate();
  const isEdit = !!id;

  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const detail = useDistributor(id);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
    mode: "onTouched",
    defaultValues: distributorDefaults as DistributorFormValues,
    // We scroll/focus the first error ourselves (see `scrollToFirstError`) so
    // custom controls (Combobox/DatePicker/MultiSelect) are handled too.
    shouldFocusError: false,
  });

  // Paths already saved on the record — shown as thumbnails and retained on
  // update so leaving an image field untouched doesn't wipe the existing files.
  // Reactive so removing one re-renders and drops it from the update payload.
  const [existingImages, setExistingImages] =
    useState<ExistingImages>(EMPTY_EXISTING);

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values);
      setExistingImages(toExistingImages(detail.data.existing));
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
        toast.success(`${values.firmName} ${isEdit ? "updated" : "created"}`);
        navigate({ to: "/distributors" });
      };
      const onError = () =>
        toast.error(
          `Couldn't ${isEdit ? "update" : "create"} the distributor. Please try again.`,
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

  return {
    register,
    control,
    errors,
    setValue,
    existingImages,
    removeExistingImage,
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
    currentYear: CURRENT_YEAR,
    maxBirthDate: MAX_BIRTH_DATE,
  };
}
