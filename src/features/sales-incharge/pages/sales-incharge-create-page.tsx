import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useCreateSalesman } from "../api/use-sales-incharge";
import {
  Field,
  Textarea,
  DatePicker,
  ImageUpload,
  AvatarUpload,
} from "../components/form-fields";
import {
  salesInchargeSchema,
  salesInchargeDefaults,
  DESIGNATIONS,
  type SalesInchargeFormValues,
} from "../lib/incharge-form";

const CURRENT_YEAR = new Date().getFullYear();

export function SalesInchargeCreatePage() {
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
        bankDetails: values.bankDetails,
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

  return (
    <div>
      <PageHeader
        title="Create Sales Incharge"
        description="Add a new sales incharge to the team."
        actions={
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate({ to: "/sales-incharge" })}
          >
            <ArrowLeft /> Back to list
          </Button>
        }
      />

      <form
        onSubmit={onSubmit}
        autoComplete="off"
        className="mt-4 rounded-xl border border-border bg-card dark:bg-transparent"
      >
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Sales incharge details
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3 xl:grid-cols-4">
          <p className="md:col-span-3 xl:col-span-4 border-b border-border pb-2 text-sm font-semibold text-foreground/90">
            Basic Details
          </p>

          <Field
            label="Profile Photo"
            error={errors.photoUrl?.message}
            className="md:col-span-3 xl:col-span-4"
          >
            <Controller
              control={control}
              name="photoUrl"
              render={({ field }) => (
                <AvatarUpload
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Name Of Sales Incharge" error={errors.name?.message}>
            <Input placeholder="e.g. Ramesh Yadav" {...register("name")} />
          </Field>

          <Field
            label="Employer Company"
            error={errors.employerCompany?.message}
          >
            <Input
              placeholder="e.g. Rajani Group"
              {...register("employerCompany")}
            />
          </Field>

          <Field label="Designation" error={errors.designation?.message}>
            <Controller
              control={control}
              name="designation"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select designation"
                  searchPlaceholder="Search designation"
                />
              )}
            />
          </Field>

          <Field label="Date Of Birth" error={errors.dateOfBirth?.message}>
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={1950}
                  toYear={CURRENT_YEAR}
                />
              )}
            />
          </Field>

          <Field
            label="Marriage Anniversary Date"
            optional
            error={errors.marriageAnniversary?.message}
          >
            <Controller
              control={control}
              name="marriageAnniversary"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={1970}
                  toYear={CURRENT_YEAR}
                />
              )}
            />
          </Field>

          <Field label="Mobile Number" error={errors.mobile?.message}>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit number"
              {...register("mobile")}
            />
          </Field>

          <Field
            label="Alternate Mobile Number"
            optional
            error={errors.alternateMobile?.message}
          >
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit number"
              {...register("alternateMobile")}
            />
          </Field>

          <Field label="Email Id" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="name@rajanigroup.com"
              {...register("email")}
            />
          </Field>

          <Field label="Date Of Joining" error={errors.dateOfJoining?.message}>
            <Controller
              control={control}
              name="dateOfJoining"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={2000}
                  toYear={CURRENT_YEAR + 1}
                />
              )}
            />
          </Field>

          <Field
            label="Date Of Exit"
            optional
            error={errors.dateOfExit?.message}
          >
            <Controller
              control={control}
              name="dateOfExit"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={2000}
                  toYear={CURRENT_YEAR + 5}
                />
              )}
            />
          </Field>

          <Field label="Salary — Basic (₹)" error={errors.basicSalary?.message}>
            <Input
              inputMode="numeric"
              placeholder="e.g. 40000"
              {...register("basicSalary")}
            />
          </Field>

          <Field
            label="Salary — Allowance (₹)"
            error={errors.allowance?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 10000"
              {...register("allowance")}
            />
          </Field>

          <Field
            label="Address"
            error={errors.address?.message}
            className="md:col-span-3 xl:col-span-4"
          >
            <Textarea
              placeholder="Full residential address"
              {...register("address")}
            />
          </Field>

          {/* Bank details */}
          <div className="md:col-span-3 xl:col-span-4">
            <p className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground/90">
              Bank Details
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
              <Field
                label="Account Holder Name"
                error={errors.bankDetails?.accountName?.message}
              >
                <Input
                  placeholder="As per bank records"
                  {...register("bankDetails.accountName")}
                />
              </Field>
              <Field
                label="Account Number"
                error={errors.bankDetails?.accountNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  placeholder="Account number"
                  {...register("bankDetails.accountNumber")}
                />
              </Field>
              <Field
                label="IFSC Code"
                error={errors.bankDetails?.ifsc?.message}
              >
                <Input
                  placeholder="e.g. HDFC0001234"
                  className="uppercase"
                  {...register("bankDetails.ifsc")}
                />
              </Field>
              <Field
                label="Bank Name"
                error={errors.bankDetails?.bankName?.message}
              >
                <Input
                  placeholder="e.g. HDFC Bank"
                  {...register("bankDetails.bankName")}
                />
              </Field>
            </div>
          </div>

          {/* Aadhaar */}
          <div className="md:col-span-3 xl:col-span-4">
            <p className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground/90">
              Adharcard
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
              <Field
                label="Aadhaar Number"
                error={errors.aadharNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit number"
                  {...register("aadharNumber")}
                />
              </Field>
              <Field
                label="Aadhaar Card — Front"
                optional
                error={errors.aadharFrontUrl?.message}
              >
                <Controller
                  control={control}
                  name="aadharFrontUrl"
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <Field
                label="Aadhaar Card — Back"
                optional
                error={errors.aadharBackUrl?.message}
              >
                <Controller
                  control={control}
                  name="aadharBackUrl"
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate({ to: "/sales-incharge" })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer text-white"
            disabled={createSalesman.isPending}
          >
            {createSalesman.isPending ? "Saving…" : "Create sales incharge"}
          </Button>
        </div>
      </form>
    </div>
  );
}
