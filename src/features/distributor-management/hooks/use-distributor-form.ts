import { useEffect, useRef } from "react";
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
  });

  // Paths already saved on the record — retained on update so leaving an image
  // field untouched doesn't wipe the existing files.
  const existingFiles = useRef<DistributorExistingFiles | null>(null);

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values);
      existingFiles.current = detail.data.existing;
    }
  }, [detail.data, reset]);

  // Cascading territory selection — watch parents to build child options.
  const stateId = watch("stateId");
  const zoneId = watch("zoneId");
  const districtId = watch("districtId");
  const talukaId = watch("talukaId");
  const cityId = watch("cityId");

  const onSubmit = handleSubmit((values) => {
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
        { ...input, id, existing: existingFiles.current ?? EMPTY_FILES },
        { onSuccess, onError },
      );
    } else {
      createDistributor.mutate(input, { onSuccess, onError });
    }
  });

  const goBack = () => navigate({ to: "/distributors" });

  return {
    register,
    control,
    errors,
    setValue,
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

const EMPTY_FILES: DistributorExistingFiles = {
  officeImagePaths: [],
  godownImagePaths: [],
  panCardPhotoPath: "",
  gstPhotoPath: "",
  advanceChequePhotoPath: "",
};
