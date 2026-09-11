import { Controller } from "react-hook-form";
import { ArrowLeft, User, Landmark, IdCard } from "lucide-react";
import { decryptParams } from "@/lib/crypto";
import { errorStatus, getApiErrorMessage } from "@/lib/api-error";
import { mediaUrl } from "@/lib/media";
import { useCompanies, useRedirectOnCompanySwitch } from "@/features/company";
import { PageHeader } from "@/components/common/page-header";
import { DraftsButton } from "@/components/common/drafts-button";
import { FormSection } from "@/components/common/form-section";
import { IfscInput } from "@/components/common/ifsc-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  Textarea,
  DatePicker,
  FileDropzoneField,
  AvatarUpload,
  MultiSelect,
} from "../components/form-fields";
import { useDesignationSelect } from "../hooks/use-designation-select";
import { useSalesInchargeForm } from "../hooks/use-sales-incharge-form";
import { SALES_INCHARGE_DRAFT_KEY } from "../lib/incharge-form";

interface SalesInchargeCreatePageProps {
  /**
   * Encrypted params from the `?data=` search param. An `id` switches the page
   * into edit mode (GET to seed, PUT to save); a `draftId` resumes a locally
   * saved draft. Neither → a fresh create. The same page and form handle all
   * three.
   */
  data?: string;
}

export function SalesInchargeCreatePage({
  data,
}: SalesInchargeCreatePageProps) {
  // Every option list and the record itself are tenant-scoped — switching the
  // active company mid-form leaves the list behind, not a half-migrated draft.
  useRedirectOnCompanySwitch("/sales-incharge");

  // Decrypt the params from the URL; missing/malformed → create mode.
  const params = data
    ? decryptParams<{ id?: string | number; draftId?: string }>(data)
    : null;
  const id = params?.id != null ? String(params.id) : "";
  const draftId = params?.draftId;

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
    error,
    goBack,
    currentYear,
    maxBirthDate,
    today,
    birthDate,
    designationName,
    saveOnBlur,
    isRestoring,
    openDraft,
    startNewDraft,
  } = useSalesInchargeForm(id || undefined, draftId);

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
    : draftId
      ? "Carrying on from a saved draft. Changes stay on this device until you submit."
      : "Add a new sales incharge to the team.";
  const submitLabel = isEdit
    ? "Update sales incharge"
    : "Create sales incharge";

  // Edit-mode load / error states before the form is seeded — and the brief
  // read while a draft is restored, so fields don't flash empty first.
  if ((isEdit && (isLoading || isError)) || isRestoring) {
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
          {isRestoring ? (
            "Restoring your draft…"
          ) : isError ? (
            <>
              <p>Couldn't load this sales incharge. Please go back and try again.</p>
              {/* The reason, verbatim — a bare "couldn't load" leaves nothing to
                  act on, whether it's a 404, a permission problem or the API
                  returning a shape the client rejects. */}
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                {errorStatus(error) ? `${errorStatus(error)} — ` : ""}
                {getApiErrorMessage(error)}
              </p>
            </>
          ) : (
            "Loading sales incharge…"
          )}
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
          <div className="flex items-center gap-2">
            {/* Create/draft mode only — an existing record is server-backed, so
                there's no draft of it to switch between. */}
            {!isEdit ? (
              <DraftsButton
                formKey={SALES_INCHARGE_DRAFT_KEY}
                currentId={draftId}
                onOpen={openDraft}
                onNew={startNewDraft}
                newTitle="Start a new blank draft"
                newDescription="Clears the form — saved drafts are kept."
              />
            ) : null}
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={goBack}
            >
              <ArrowLeft /> Back
            </Button>
          </div>
        }
      />

      <form
        onSubmit={onSubmit}
        // focusout bubbles, so this one listener snapshots the form into its
        // local draft whenever any field loses focus — native inputs and the
        // custom Combobox / DatePicker controls alike.
        onBlur={saveOnBlur}
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

          {/* One incharge can cover several companies — the API replaces the
              whole `company_id` list with whatever is selected here. */}
          <Field
            label="Employer Companies"
            error={errors.employerCompanies?.message}
          >
            <Controller
              control={control}
              name="employerCompanies"
              render={({ field }) => (
                <MultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={companyOptions}
                  placeholder={
                    companies.isLoading
                      ? "Loading companies…"
                      : "Select employer companies"
                  }
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
                  minDate={birthDate}
                  maxDate={today}
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
                  minDate={birthDate}
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
                  minDate={birthDate}
                  maxDate={today}
                />
              )}
            />
          </Field>

          <Field label="Salary — Basic (₹)" error={errors.basicSalary?.message}>
            <Input
              inputMode="decimal"
              placeholder="e.g. 40000"
              {...register("basicSalary")}
            />
          </Field>

          <Field
            label="Salary — Allowance (₹)"
            error={errors.allowance?.message}
          >
            <Input
              inputMode="decimal"
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
                <IfscInput {...register("bankIfsc")} />
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
