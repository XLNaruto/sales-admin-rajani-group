import { Controller } from "react-hook-form";
import { ArrowLeft, Store, MapPin, Briefcase, Landmark } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FormSection } from "@/components/common/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Field, DatePicker, MultiSelect } from "@/features/beat-creation";
import { FileInput } from "../components/file-input";
import { useDistributorForm } from "../hooks/use-distributor-form";
import {
  useCitySelect,
  useDistrictSelect,
  useStateSelect,
  useTalukaSelect,
  useZoneSelect,
} from "@/features/location";
import {
  DISTRIBUTOR_STATUSES,
  FIRM_TYPES,
  MARKET_SYSTEMS,
  MARKET_TYPES,
  PAYMENT_CONDITIONS,
  YES_NO,
  toOptions,
  villagesByCity,
} from "../lib/distributor-reference";

/** Parse a string form id into the numeric id the location API expects. */
const toId = (v?: string) => (v ? Number(v) : undefined);

export function DistributorCreatePage() {
  const {
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
    isPending,
    goBack,
    currentYear,
    maxBirthDate,
  } = useDistributorForm();

  // Cascading geography masters — each level is a scroll-lazy, server-searched
  // dropdown scoped to its parent's id.
  const stateSelect = useStateSelect();
  const zoneSelect = useZoneSelect(toId(stateId));
  const districtSelect = useDistrictSelect(toId(zoneId));
  const talukaSelect = useTalukaSelect(toId(districtId));
  const citySelect = useCitySelect(toId(talukaId));

  return (
    <div>
      <PageHeader
        title="Add Distributor"
        description="Create a new distributor record with firm, coverage, business and financial details."
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
          {/* ------------------------ Firm & owner ------------------------ */}
          <FormSection
            icon={Store}
            title="Firm & Owner Details"
            description="Identity and contact information of the distributor."
            className="mt-0"
          />

          <Field
            label="Distributor's Firm Name"
            error={errors.firmName?.message}
          >
            <Input
              placeholder="Distributor's Firm Name"
              {...register("firmName")}
            />
          </Field>

          <Field label="Type Of Firm" error={errors.firmType?.message}>
            <Controller
              control={control}
              name="firmType"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={FIRM_TYPES}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field
            label="Owner's / Partner Name"
            error={errors.ownerName?.message}
          >
            <Input
              placeholder="Owner's / Partner Name"
              {...register("ownerName")}
            />
          </Field>

          <Field
            label="Owner's / Partner Mobile Number"
            error={errors.ownerMobile?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="10-digit mobile number"
              {...register("ownerMobile")}
            />
          </Field>

          <Field
            label="Owner's / Partner Birth Date"
            optional
            error={errors.ownerBirthDate?.message}
          >
            <Controller
              control={control}
              name="ownerBirthDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={1940}
                  toYear={currentYear}
                  maxDate={maxBirthDate}
                />
              )}
            />
          </Field>

          <Field
            label="Owner's / Partner Marriage Anniversary Date"
            optional
            error={errors.ownerAnniversaryDate?.message}
          >
            <Controller
              control={control}
              name="ownerAnniversaryDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  fromYear={1960}
                  toYear={currentYear}
                />
              )}
            />
          </Field>

          <Field
            label="Communication Mobile Number"
            optional
            error={errors.communicationMobile?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="10-digit mobile number"
              {...register("communicationMobile")}
            />
          </Field>

          <Field
            label="Multiple Login For Same Profile"
            optional
            hint="For partnership firms"
            error={errors.multipleLogin?.message}
          >
            <Controller
              control={control}
              name="multipleLogin"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={YES_NO}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field label="E-mail Id" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="E-mail Id"
              {...register("email")}
            />
          </Field>

          <Field label="Distributor Code" optional error={errors.code?.message}>
            <Input
              placeholder="Auto-generated if left blank"
              {...register("code")}
            />
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={DISTRIBUTOR_STATUSES}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          {/* --------------------- Location & coverage -------------------- */}
          <FormSection
            icon={MapPin}
            title="Location & Coverage"
            description="Addresses, territory and the markets served."
          />

          <Field label="Office Address" error={errors.officeAddress?.message}>
            <textarea
              rows={2}
              placeholder="Office Address"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("officeAddress")}
            />
          </Field>

          <Field
            label="Godown Address"
            optional
            error={errors.godownAddress?.message}
          >
            <textarea
              rows={2}
              placeholder="Godown Address"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("godownAddress")}
            />
          </Field>

          <Field
            label="Home Address"
            optional
            error={errors.homeAddress?.message}
          >
            <textarea
              rows={2}
              placeholder="Home Address"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("homeAddress")}
            />
          </Field>

          <Field label="State" error={errors.stateId?.message}>
            <Controller
              control={control}
              name="stateId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("zoneId", "");
                    setValue("districtId", "");
                    setValue("talukaId", "");
                    setValue("cityId", "");
                    setValue("villageIds", []);
                    setValue("agencyTalukaIds", []);
                  }}
                  options={stateSelect.options}
                  onScrollEnd={stateSelect.onScrollEnd}
                  loading={stateSelect.loading}
                  onSearchChange={stateSelect.onSearchChange}
                  placeholder="Select…"
                  searchPlaceholder="Search state"
                />
              )}
            />
          </Field>

          <Field label="Zone" error={errors.zoneId?.message}>
            <Controller
              control={control}
              name="zoneId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("districtId", "");
                    setValue("talukaId", "");
                    setValue("cityId", "");
                    setValue("villageIds", []);
                  }}
                  options={zoneSelect.options}
                  onScrollEnd={zoneSelect.onScrollEnd}
                  loading={zoneSelect.loading}
                  onSearchChange={zoneSelect.onSearchChange}
                  placeholder={stateId ? "Select…" : "Select a state first"}
                  searchPlaceholder="Search zone"
                />
              )}
            />
          </Field>

          <Field label="District" error={errors.districtId?.message}>
            <Controller
              control={control}
              name="districtId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("talukaId", "");
                    setValue("cityId", "");
                    setValue("villageIds", []);
                  }}
                  options={districtSelect.options}
                  onScrollEnd={districtSelect.onScrollEnd}
                  loading={districtSelect.loading}
                  onSearchChange={districtSelect.onSearchChange}
                  placeholder={zoneId ? "Select…" : "Select a zone first"}
                  searchPlaceholder="Search district"
                />
              )}
            />
          </Field>

          <Field label="Taluka" error={errors.talukaId?.message}>
            <Controller
              control={control}
              name="talukaId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("cityId", "");
                    setValue("villageIds", []);
                  }}
                  options={talukaSelect.options}
                  onScrollEnd={talukaSelect.onScrollEnd}
                  loading={talukaSelect.loading}
                  onSearchChange={talukaSelect.onSearchChange}
                  placeholder={
                    districtId ? "Select…" : "Select a district first"
                  }
                  searchPlaceholder="Search taluka"
                />
              )}
            />
          </Field>

          <Field label="City" error={errors.cityId?.message}>
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("villageIds", []);
                  }}
                  options={citySelect.options}
                  onScrollEnd={citySelect.onScrollEnd}
                  loading={citySelect.loading}
                  onSearchChange={citySelect.onSearchChange}
                  placeholder={talukaId ? "Select…" : "Select a taluka first"}
                  searchPlaceholder="Search city"
                />
              )}
            />
          </Field>

          <Field label="Pincode" optional error={errors.pincode?.message}>
            <Input
              inputMode="numeric"
              placeholder="6-digit pincode"
              {...register("pincode")}
            />
          </Field>

          <Field
            label="Delivery Route (Delivery Day)"
            optional
            error={errors.deliveryRoute?.message}
          >
            <Input
              placeholder="Delivery Route (Delivery Day)"
              {...register("deliveryRoute")}
            />
          </Field>

          <Field
            label="Taluka Of Agency"
            optional
            error={errors.agencyTalukaIds?.message}
          >
            <Controller
              control={control}
              name="agencyTalukaIds"
              render={({ field }) => (
                <MultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={talukaSelect.options}
                  placeholder={
                    districtId ? "Select talukas…" : "Select a district first"
                  }
                  searchPlaceholder="Search taluka"
                />
              )}
            />
          </Field>

          <Field
            label="Market Type"
            optional
            error={errors.marketType?.message}
          >
            <Controller
              control={control}
              name="marketType"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={MARKET_TYPES}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field
            label="List Of Villages"
            optional
            error={errors.villageIds?.message}
          >
            <Controller
              control={control}
              name="villageIds"
              render={({ field }) => (
                <MultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={toOptions(villagesByCity(cityId))}
                  placeholder={
                    cityId ? "Select villages…" : "Select a city first"
                  }
                  searchPlaceholder="Search village"
                />
              )}
            />
          </Field>

          <Field
            label="Retailers In Local Market"
            optional
            error={errors.retailersLocal?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 120"
              {...register("retailersLocal")}
            />
          </Field>

          <Field
            label="Retailers In Rural Market"
            optional
            error={errors.retailersRural?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 45"
              {...register("retailersRural")}
            />
          </Field>

          <Field
            label="Market System"
            optional
            error={errors.marketSystem?.message}
          >
            <Controller
              control={control}
              name="marketSystem"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={MARKET_SYSTEMS}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field label="Weekly Off" optional error={errors.weeklyOff?.message}>
            <Input placeholder="e.g. Sunday" {...register("weeklyOff")} />
          </Field>

          <Field
            label="Geo Location Of Distributor"
            optional
            error={errors.geoLocation?.message}
          >
            <Input
              placeholder="Latitude, Longitude"
              {...register("geoLocation")}
            />
          </Field>

          <Field
            label="Images Of Office"
            optional
            error={errors.officeImages?.message}
          >
            <Controller
              control={control}
              name="officeImages"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                  multiple
                />
              )}
            />
          </Field>

          <Field
            label="Images Of Godown"
            optional
            error={errors.godownImages?.message}
          >
            <Controller
              control={control}
              name="godownImages"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                  multiple
                />
              )}
            />
          </Field>

          {/* ----------------------- Business details --------------------- */}
          <FormSection
            icon={Briefcase}
            title="Business Details"
            description="Agencies, assigned products and delivery setup."
          />

          <Field
            label="Details Of Other Agencies"
            optional
            error={errors.otherAgencies?.message}
          >
            <textarea
              rows={2}
              placeholder="Details Of Other Agencies"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("otherAgencies")}
            />
          </Field>

          <Field
            label="Agencies Of Similar Category Of Rajani Product"
            optional
            error={errors.similarAgencies?.message}
          >
            <textarea
              rows={2}
              placeholder="Agencies Of Similar Category Of Rajani Product"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("similarAgencies")}
            />
          </Field>

          <Field
            label="Assigned Rajani Products"
            optional
            error={errors.assignedProducts?.message}
          >
            <textarea
              rows={2}
              placeholder="Assigned Rajani Products"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("assignedProducts")}
            />
          </Field>

          <Field
            label="Target Of Every Product"
            optional
            error={errors.productTargets?.message}
          >
            <textarea
              rows={2}
              placeholder="Target Of Every Product"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring"
              {...register("productTargets")}
            />
          </Field>

          <Field
            label="Delivery Vehicle"
            optional
            error={errors.deliveryVehicle?.message}
          >
            <Controller
              control={control}
              name="deliveryVehicle"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={YES_NO}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field
            label="Delivery Vehicle Detail"
            optional
            error={errors.deliveryVehicleDetail?.message}
          >
            <Input
              placeholder="Delivery Vehicle Detail"
              {...register("deliveryVehicleDetail")}
            />
          </Field>

          <Field
            label="Godown Size (Sqft)"
            optional
            error={errors.godownSize?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 1200"
              {...register("godownSize")}
            />
          </Field>

          <Field
            label="Year Of Est."
            optional
            error={errors.yearOfEst?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 2015"
              {...register("yearOfEst")}
            />
          </Field>

          {/* ----------------------- Legal & financial -------------------- */}
          <FormSection
            icon={Landmark}
            title="Legal & Financial"
            description="PAN, GST, cheques and bank details."
          />

          <Field
            label="Pan Card Number"
            optional
            error={errors.panNumber?.message}
          >
            <Input placeholder="ABCDE1234F" {...register("panNumber")} />
          </Field>

          <Field
            label="Pan Card Photo"
            optional
            error={errors.panPhoto?.message}
          >
            <Controller
              control={control}
              name="panPhoto"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                />
              )}
            />
          </Field>

          <Field label="GST Number" optional error={errors.gstNumber?.message}>
            <Input placeholder="15-digit GSTIN" {...register("gstNumber")} />
          </Field>

          <Field label="GST Photo" optional error={errors.gstPhoto?.message}>
            <Controller
              control={control}
              name="gstPhoto"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                />
              )}
            />
          </Field>

          <Field
            label="Advance Cheque Numbers"
            optional
            error={errors.advanceChequeNumbers?.message}
          >
            <Input
              placeholder="Enter 5 cheque numbers"
              {...register("advanceChequeNumbers")}
            />
          </Field>

          <Field
            label="Advance Cheque Photo"
            optional
            error={errors.advanceChequePhoto?.message}
          >
            <Controller
              control={control}
              name="advanceChequePhoto"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                  multiple
                />
              )}
            />
          </Field>

          <Field
            label="Payment Condition"
            optional
            error={errors.paymentCondition?.message}
          >
            <Controller
              control={control}
              name="paymentCondition"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={PAYMENT_CONDITIONS}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          {/* Bank details */}
          <div className="col-span-full">
            <FormSection
              icon={Landmark}
              title="Bank Details"
              description="Account used for payments and settlements."
              className="mb-4"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <Field
                label="Account Holder Name"
                optional
                error={errors.bankAccountName?.message}
              >
                <Input
                  placeholder="As per bank records"
                  {...register("bankAccountName")}
                />
              </Field>
              <Field
                label="Account Number"
                optional
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
                optional
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
                optional
                error={errors.bankName?.message}
              >
                <Input
                  placeholder="e.g. HDFC Bank"
                  {...register("bankName")}
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
            {isPending ? "Saving…" : "Save Distributor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
