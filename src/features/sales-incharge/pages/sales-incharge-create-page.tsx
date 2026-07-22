import { Controller } from "react-hook-form";
import { ArrowLeft, User, Landmark, IdCard } from "lucide-react";
import { decryptParams } from "@/lib/crypto";
import { mediaUrl } from "@/lib/media";
import { useCompanies } from "@/features/company";
import { PageHeader } from "@/components/common/page-header";
import { FormSection } from "@/components/common/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  Textarea,
  DatePicker,
  FileDropzoneField,
  AvatarUpload,
} from "../components/form-fields";
import { useDesignationSelect } from "../hooks/use-designation-select";
import { useSalesInchargeForm } from "../hooks/use-sales-incharge-form";

interface SalesInchargeCreatePageProps {
  /**
   * Encrypted sales-incharge id from the `?data=` search param. When present the
   * page switches to edit mode (GET to seed, PUT to save); otherwise it's a
   * fresh create. The same page and form handle both.
   */
  data?: string;
}

export function SalesInchargeCreatePage({
  data,
}: SalesInchargeCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const id = data
    ? String(decryptParams<{ id?: string | number }>(data)?.id ?? "")
    : "";

  const {
    register,
    control,
    errors,
    existingImages,
    removeExistingImage,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    goBack,
    currentYear,
    maxBirthDate,
    designationName,
  } = useSalesInchargeForm(id || undefined);

  // Designation options are server-searched + paged (GET …/designations): the
  // search box query is sent to the API, not filtered client-side.
  const designationSelect = useDesignationSelect();

  // Employer-company options — the tenants the caller belongs to (GET
  // /me/companies). Small list, so the combobox filters client-side.
  const companies = useCompanies();
  const companyOptions =
    companies.data?.companies.map((c) => ({
      value: String(c.id),
      label: c.name,
    })) ?? [];

  const title = isEdit ? "Edit Sales Incharge" : "Create Sales Incharge";
  const description = isEdit
    ? "Update this sales incharge's personal, employment, bank and identity details."
    : "Add a new sales incharge to the team.";
  const submitLabel = isEdit
    ? "Update sales incharge"
    : "Create sales incharge";

  // Edit-mode load / error states before the form is seeded.
  if (isEdit && (isLoading || isError)) {
    return (
      <div>
        <PageHeader
          title={title}
          description={description}
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
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-10 text-center text-sm text-muted-foreground">
          {isError
            ? "Couldn't load this sales incharge. Please go back and try again."
            : "Loading sales incharge…"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" className="cursor-pointer" onClick={goBack}>
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
            optional
            error={errors.profilePhoto?.message}
            className="col-span-full"
          >
            <Controller
              control={control}
              name="profilePhoto"
              render={({ field }) => (
                <AvatarUpload
                  value={field.value}
                  onChange={field.onChange}
                  existingUrl={mediaUrl(existingImages.profile)}
                  onRemoveExisting={() => removeExistingImage("profile")}
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
            <Controller
              control={control}
              name="employerCompany"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={companyOptions}
                  loading={companies.isLoading}
                  placeholder="Select employer company"
                  searchPlaceholder="Search company"
                />
              )}
            />
          </Field>

          <Field
            label="Designation"
            optional
            error={errors.designation?.message}
          >
            <Controller
              control={control}
              name="designation"
              render={({ field }) => {
                // Ensure the seeded designation (edit mode) is selectable/shown
                // even before its page loads in the server-searched dropdown.
                const options =
                  field.value &&
                  designationName &&
                  !designationSelect.options.some((o) => o.value === field.value)
                    ? [
                        { value: field.value, label: designationName },
                        ...designationSelect.options,
                      ]
                    : designationSelect.options;
                return (
                  <Combobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={options}
                    onScrollEnd={designationSelect.onScrollEnd}
                    loading={designationSelect.loading}
                    onSearchChange={designationSelect.onSearchChange}
                    placeholder="Select designation"
                    searchPlaceholder="Search designation"
                  />
                );
              }}
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
                  maxDate={maxBirthDate}
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
              <Field label="IFSC Code" error={errors.bankIfsc?.message}>
                <Input
                  placeholder="e.g. HDFC0001234"
                  className="uppercase"
                  {...register("bankIfsc")}
                />
              </Field>
              <Field label="Bank Name" error={errors.bankName?.message}>
                <Input placeholder="e.g. HDFC Bank" {...register("bankName")} />
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
                error={errors.aadharFront?.message}
              >
                <Controller
                  control={control}
                  name="aadharFront"
                  render={({ field }) => (
                    <FileDropzoneField
                      value={field.value}
                      onChange={field.onChange}
                      existingUrl={mediaUrl(existingImages.aadharFront)}
                      onRemoveExisting={() =>
                        removeExistingImage("aadharFront")
                      }
                      label="Upload Aadhaar front"
                      hint="JPG, JPEG or PNG · up to 5 MB"
                    />
                  )}
                />
              </Field>
              <Field
                label="Aadhaar Card — Back"
                optional
                error={errors.aadharBack?.message}
              >
                <Controller
                  control={control}
                  name="aadharBack"
                  render={({ field }) => (
                    <FileDropzoneField
                      value={field.value}
                      onChange={field.onChange}
                      existingUrl={mediaUrl(existingImages.aadharBack)}
                      onRemoveExisting={() => removeExistingImage("aadharBack")}
                      label="Upload Aadhaar back"
                      hint="JPG, JPEG or PNG · up to 5 MB"
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
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
