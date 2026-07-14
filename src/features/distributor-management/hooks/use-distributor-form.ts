import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateDistributor } from "../api/use-distributors";
import {
  distributorSchema,
  distributorDefaults,
  type DistributorFormValues,
} from "../lib/distributor-form";

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

/**
 * Owns the create-distributor form: validation wiring, the create mutation,
 * the cascading territory watches, the submit → map → navigate flow and the
 * year bounds for the date pickers. The page consumes this and only lays out
 * fields.
 */
export function useDistributorForm() {
  const navigate = useNavigate();
  const createDistributor = useCreateDistributor();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorSchema),
    mode: "onTouched",
    defaultValues: distributorDefaults as DistributorFormValues,
  });

  // Cascading territory selection — watch parents to build child options.
  const stateId = watch("stateId");
  const zoneId = watch("zoneId");
  const districtId = watch("districtId");
  const talukaId = watch("talukaId");
  const cityId = watch("cityId");

  const onSubmit = handleSubmit((values) => {
    createDistributor.mutate(
      {
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
      },
      {
        onSuccess: () => {
          toast.success(`${values.firmName} created`);
          navigate({ to: "/distributors" });
        },
        onError: () =>
          toast.error("Couldn't create the distributor. Please try again."),
      },
    );
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
    isPending: createDistributor.isPending,
    goBack,
    currentYear: CURRENT_YEAR,
    maxBirthDate: MAX_BIRTH_DATE,
  };
}
