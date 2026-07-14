import { Controller } from "react-hook-form";
import { ArrowLeft, User, Landmark, IdCard } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FormSection } from "@/components/common/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  Textarea,
  DatePicker,
  ImageUpload,
  AvatarUpload,
} from "../components/form-fields";
import { DESIGNATIONS } from "../lib/incharge-form";
import { useSalesInchargeForm } from "../hooks/use-sales-incharge-form";

export function SalesInchargeCreatePage() {
  const {
    register,
    control,
    errors,
    onSubmit,
    isPending,
    goBack,
    currentYear,
  } = useSalesInchargeForm();

  return (
    <div>
      <PageHeader
        title="Create Sales Incharge"
        description="Add a new sales incharge to the team."
        actions={
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={goBack}
          >
            <ArrowLeft /> Back to list
          </Button>
        }
      />

      <form
        onSubmit={onSubmit}
        autoComplete="off"
        className="mt-4 rounded-xl border border-border/50 bg-card shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px] dark:bg-transparent"
      >
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <FormSection
            icon={User}
            title="Basic Details"
            description="Personal, contact and employment information."
            className="mt-0"
          />

          <Field
            label="Profile Photo"
            error={errors.photoUrl?.message}
            className="col-span-full"
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
                  toYear={currentYear}
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
                  toYear={currentYear}
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
                  toYear={currentYear + 1}
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
                  toYear={currentYear + 5}
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
            className="col-span-full"
          >
            <Textarea
              placeholder="Full residential address"
              {...register("address")}
            />
          </Field>

          {/* Bank details */}
          <div className="col-span-full">
            <FormSection
              icon={Landmark}
              title="Bank Details"
              description="Salary account for payouts."
              className="mb-4"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <Field
                label="Account Holder Name"
                error={errors.bankAccountName?.message}
              >
                <Input
                  placeholder="As per bank records"
                  {...register("bankAccountName")}
                />
              </Field>
              <Field
                label="Account Number"
                error={errors.bankAccountNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  placeholder="Account number"
                  {...register("bankAccountNumber")}
                />
              </Field>
              <Field
                label="IFSC Code"
                error={errors.bankIfsc?.message}
              >
                <Input
                  placeholder="e.g. HDFC0001234"
                  className="uppercase"
                  {...register("bankIfsc")}
                />
              </Field>
              <Field
                label="Bank Name"
                error={errors.bankName?.message}
              >
                <Input
                  placeholder="e.g. HDFC Bank"
                  {...register("bankName")}
                />
              </Field>
            </div>
          </div>

          {/* Aadhaar */}
          <div className="col-span-full">
            <FormSection
              icon={IdCard}
              title="Aadhaar Card"
              description="Identity proof — number and photos."
              className="mb-4"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
            onClick={goBack}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer text-white"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Create sales incharge"}
          </Button>
        </div>
      </form>
    </div>
  );
}
