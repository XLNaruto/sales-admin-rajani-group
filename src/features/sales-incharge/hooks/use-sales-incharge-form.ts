import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCreateSalesman } from "../api/use-sales-incharge";
import {
  salesInchargeSchema,
  salesInchargeDefaults,
  type SalesInchargeFormValues,
} from "../lib/incharge-form";

/**
 * Owns the create-sales-incharge form: validation wiring, the create mutation,
 * the submit → map → navigate flow and the year bounds for the date pickers.
 * The page consumes this and only lays out fields.
 */
export function useSalesInchargeForm() {
  const navigate = useNavigate();
  const createSalesman = useCreateSalesman();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SalesInchargeFormValues>({
    resolver: zodResolver(salesInchargeSchema),
    mode: "onTouched",
    defaultValues: salesInchargeDefaults as SalesInchargeFormValues,
  });

  const onSubmit = handleSubmit((values) => {
    createSalesman.mutate(
      {
        name: values.name,
        employerCompany: values.employerCompany,
        address: values.address,
        dateOfBirth: values.dateOfBirth,
        marriageAnniversary: values.marriageAnniversary || undefined,
        mobile: values.mobile,
        alternateMobile: values.alternateMobile || undefined,
        dateOfJoining: values.dateOfJoining,
        dateOfExit: values.dateOfExit || undefined,
        email: values.email,
        basicSalary: Number(values.basicSalary),
        allowance: Number(values.allowance),
        designation: values.designation,
        photoUrl: values.photoUrl || undefined,
        bankAccountName: values.bankAccountName,
        bankAccountNumber: values.bankAccountNumber,
        bankIfsc: values.bankIfsc,
        bankName: values.bankName,
        aadharNumber: values.aadharNumber,
        aadharFrontUrl: values.aadharFrontUrl || undefined,
        aadharBackUrl: values.aadharBackUrl || undefined,
        status: values.dateOfExit ? "inactive" : "active",
      },
      {
        onSuccess: () => {
          toast.success(`${values.name} added to the sales team`);
          navigate({ to: "/sales-incharge" });
        },
        onError: () =>
          toast.error("Couldn't create the sales incharge. Please try again."),
      },
    );
  });

  const goBack = () => navigate({ to: "/sales-incharge" });

  return {
    register,
    control,
    errors,
    onSubmit,
    isPending: createSalesman.isPending,
    goBack,
    currentYear: new Date().getFullYear(),
  };
}
