import { Controller } from "react-hook-form";
import { ArrowLeft, Store, MapPin, Briefcase, Landmark } from "lucide-react";
import { decryptParams } from "@/lib/crypto";
import { PageHeader } from "@/components/common/page-header";
import { DraftsButton } from "@/components/common/drafts-button";
import { FormSection } from "@/components/common/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Field, MultiSelect } from "@/features/beat-creation";
import { GeoLocationPicker } from "@/components/maps/geo-location-picker";
import { FileInput } from "@/components/common/file-input";
import { OwnerPartnersField } from "../components/owner-partners-field";
import { useDistributorForm } from "../hooks/use-distributor-form";
import { DISTRIBUTOR_DRAFT_KEY } from "../lib/distributor-form";
import { useCompanies } from "@/features/company";
import {
  useRoutes,
  usePaymentConditions,
} from "@/features/master-management";
import {
  useCitySelect,
  useDistrictSelect,
  useStateSelect,
  useTalukaSelect,
  useZoneSelect,
} from "@/features/location";
import {
  DELIVERY_DAYS,
  FIRM_TYPES,
  MARKET_SYSTEMS,
  MARKET_TYPES,
  WEEKLY_OFF_DAYS,
  YES_NO,
} from "../lib/distributor-reference";

/** Parse a string form id into the numeric id the location API expects. */
const toId = (v?: string) => (v ? Number(v) : undefined);

interface DistributorCreatePageProps {
  /**
   * Encrypted params from the `?data=` search param. An `id` switches the page
   * into edit mode (GET to seed, PATCH to save); a `draftId` resumes a locally
   * saved draft. Neither → a fresh create. The same page and form handle all
   * three.
   */
  data?: string;
}

export function DistributorCreatePage({ data }: DistributorCreatePageProps) {
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
    setValue,
    existingImages,
    removeExistingImage,
    geoLabels,
    setGeoLabels,
    stateId,
    zoneId,
    districtId,
    talukaId,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    goBack,
    saveOnBlur,
    isRestoring,
    openDraft,
    startNewDraft,
  } = useDistributorForm(id || undefined, draftId);

  // Keep a mobile input to digits only, capped at 10 — mirrors the login page.
  const digitsOnly = (max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, max);
  };

  const title = isEdit ? "Edit Distributor" : "Add Distributor";
  const description = isEdit
    ? "Update the distributor's firm, coverage, business and financial details."
    : draftId
      ? "Carrying on from a saved draft. Changes stay on this device until you submit."
      : "Create a new distributor record with firm, coverage, business and financial details.";
  const submitLabel = isEdit ? "Update Distributor" : "Save Distributor";

  // Cascading geography masters — each level is a scroll-lazy, server-searched
  // dropdown scoped to its parent's id.
  // Company (tenant) options — the companies the caller belongs to (GET
  // /me/companies). A distributor can be attached to more than one.
  const companies = useCompanies();
  const companyOptions = (companies.data?.companies ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  // Payment-condition master — same shape as product divisions: a small list
  // fetched whole and searched in-place. The form holds the picked row's id,
  // which is what the distributor API stores as `payment_condition_id`.
  const paymentConditions = usePaymentConditions();
  const paymentConditionOptions = (paymentConditions.data?.items ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  // Route master (GET /routes) — same deal: the form holds the picked row's id,
  // stored by the distributor API as `delivery_route_id`. Routes are labelled
  // by name and code, which is how the warehouse team refers to them.
  const routes = useRoutes();
  const deliveryRouteOptions = (routes.data?.items ?? []).map((r) => ({
    value: String(r.id),
    label: r.code ? `${r.name} (${r.code})` : r.name,
  }));

  const stateSelect = useStateSelect();
  const zoneSelect = useZoneSelect(toId(stateId));
  const districtSelect = useDistrictSelect(toId(zoneId));
  const talukaSelect = useTalukaSelect(toId(districtId));
  // Deliberately unscoped: no `taluka_id` is ever sent, so the dropdown always
  // offers (and server-searches) every city, whatever the levels above it hold.
  // That's what makes the territory settable bottom-up — pick a city and its
  // ancestry fills in. `alwaysEnabled` is required because the query otherwise
  // idles while `taluka_id` is absent.
  const citySelect = useCitySelect(undefined, { alwaysEnabled: true });
  // "List Of Villages" comes off the same cities master — villages are rows of
  // it. Scoped to the chosen taluka when there is one, every city otherwise, so
  // the field is usable before the territory above it is filled in.
  const villageSelect = useCitySelect(toId(talukaId), { alwaysEnabled: true });

  /**
   * Picking a city sets state → zone → district → taluka from the same row the
   * cities API returns (it carries the full ancestry), so the user only has to
   * choose one field. Choosing a level manually clears the back-filled names
   * below it, since those selects go back to driving themselves.
   */
  const onCityChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    setValue("villageIds", []);

    const city = citySelect.items.find((c) => String(c.id) === value);
    if (!city) {
      setGeoLabels({});
      return;
    }

    // Written with `shouldValidate` so a "Select a district" style error left
    // over from a failed submit clears the moment the city supplies the value —
    // `setValue` alone doesn't re-run validation.
    const fill = { shouldValidate: true, shouldDirty: true } as const;
    if (city.stateId) setValue("stateId", String(city.stateId), fill);
    if (city.zoneId) setValue("zoneId", String(city.zoneId), fill);
    if (city.districtId) setValue("districtId", String(city.districtId), fill);
    setValue("talukaId", String(city.talukaId), fill);

    setGeoLabels({
      stateId: city.stateName ?? undefined,
      zoneId: city.zoneName ?? undefined,
      districtId: city.districtName ?? undefined,
      talukaId: city.talukaName ?? undefined,
      cityId: city.name,
    });
  };

  // Edit-mode load / error states before the form is seeded — and the brief
  // read while a draft is restored, so fields don't flash empty first.
  if ((isEdit && (isLoading || isError)) || isRestoring) {
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
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-10 text-center text-sm text-muted-foreground">
          {isRestoring
            ? "Restoring your draft…"
            : isError
              ? "Couldn't load this distributor. Please go back and try again."
              : "Loading distributor…"}
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
                formKey={DISTRIBUTOR_DRAFT_KEY}
                currentId={draftId}
                onOpen={openDraft}
                onNew={startNewDraft}
                newTitle="Start a new blank draft"
                newDescription="Clears the form — saved drafts are kept."
              />
            ) : null}
            <Button variant="outline" className="cursor-pointer" onClick={goBack}>
              <ArrowLeft /> Back to list
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

          {/* Every owner/partner of the firm — managed in its own modal since a
              firm can have up to 20, each with contact + greeting dates. */}
          <Controller
            control={control}
            name="owners"
            render={({ field }) => (
              <OwnerPartnersField
                value={field.value ?? []}
                onChange={field.onChange}
                error={
                  errors.owners?.message ??
                  errors.owners?.root?.message ??
                  (Array.isArray(errors.owners)
                    ? "Some partner details are incomplete. Open “Manage Partners” to fix them."
                    : undefined)
                }
              />
            )}
          />

          <Field
            label="Communication Mobile Number"
            optional
            error={errors.communicationMobile?.message}
          >
            <Input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              {...register("communicationMobile", { onChange: digitsOnly(10) })}
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
            <Input type="email" placeholder="E-mail Id" {...register("email")} />
          </Field>

          <Field label="Distributor Code" optional error={errors.code?.message}>
            <Input
              placeholder="Auto-generated if left blank"
              {...register("code")}
            />
          </Field>

          <Field
            label="Company"
            hint="A distributor can be attached to more than one company"
            error={
              errors.companyIds?.message ?? errors.companyIds?.root?.message
            }
          >
            <Controller
              control={control}
              name="companyIds"
              render={({ field }) => (
                <MultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={companyOptions}
                  placeholder={
                    companies.isLoading ? "Loading…" : "Select companies…"
                  }
                  searchPlaceholder="Search company"
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

          {/* The territory fields run bottom-up — City first, then Taluka,
              District, Zone, State — because City is the one that fills the
              rest. The levels below it stay editable for the top-down path. */}
          <Field
            label="City/Village"
            hint="Fills taluka, district, zone and state automatically"
            error={errors.cityId?.message}
          >
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={(v) => onCityChange(v, field.onChange)}
                  fallbackLabel={geoLabels.cityId}
                  options={citySelect.options}
                  onScrollEnd={citySelect.onScrollEnd}
                  loading={citySelect.loading}
                  onSearchChange={citySelect.onSearchChange}
                  placeholder="Select…"
                  searchPlaceholder="Search city"
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
                    setGeoLabels((l) => ({
                      stateId: l.stateId,
                      zoneId: l.zoneId,
                      districtId: l.districtId,
                    }));
                  }}
                  fallbackLabel={geoLabels.talukaId}
                  options={talukaSelect.options}
                  onScrollEnd={talukaSelect.onScrollEnd}
                  loading={talukaSelect.loading}
                  onSearchChange={talukaSelect.onSearchChange}
                  placeholder={
                    districtId ? "Select…" : "Pick a city, or a district first"
                  }
                  searchPlaceholder="Search taluka"
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
                    setGeoLabels((l) => ({
                      stateId: l.stateId,
                      zoneId: l.zoneId,
                    }));
                  }}
                  fallbackLabel={geoLabels.districtId}
                  options={districtSelect.options}
                  onScrollEnd={districtSelect.onScrollEnd}
                  loading={districtSelect.loading}
                  onSearchChange={districtSelect.onSearchChange}
                  placeholder={
                    zoneId ? "Select…" : "Pick a city, or a zone first"
                  }
                  searchPlaceholder="Search district"
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
                    setGeoLabels((l) => ({ stateId: l.stateId }));
                  }}
                  fallbackLabel={geoLabels.zoneId}
                  options={zoneSelect.options}
                  onScrollEnd={zoneSelect.onScrollEnd}
                  loading={zoneSelect.loading}
                  onSearchChange={zoneSelect.onSearchChange}
                  placeholder={
                    stateId ? "Select…" : "Pick a city, or a state first"
                  }
                  searchPlaceholder="Search zone"
                />
              )}
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
                    setGeoLabels({});
                  }}
                  fallbackLabel={geoLabels.stateId}
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

          <Field label="Pincode" optional error={errors.pincode?.message}>
            <Input
              inputMode="numeric"
              placeholder="6-digit pincode"
              {...register("pincode")}
            />
          </Field>

          <Field
            label="Delivery Route"
            optional
            error={errors.deliveryRouteId?.message}
          >
            <Controller
              control={control}
              name="deliveryRouteId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={deliveryRouteOptions}
                  placeholder={
                    routes.isLoading ? "Loading…" : "Select…"
                  }
                  searchPlaceholder="Search delivery route"
                />
              )}
            />
          </Field>

          <Field
            label="Delivery Day"
            optional
            error={errors.deliveryRouteDay?.message}
          >
            <Controller
              control={control}
              name="deliveryRouteDay"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={DELIVERY_DAYS}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
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
                  options={villageSelect.options}
                  onScrollEnd={villageSelect.onScrollEnd}
                  loading={villageSelect.loading}
                  onSearchChange={villageSelect.onSearchChange}
                  placeholder="Select villages…"
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
            <Controller
              control={control}
              name="weeklyOff"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={WEEKLY_OFF_DAYS}
                  placeholder="Select…"
                  searchable={false}
                />
              )}
            />
          </Field>

          <Field
            label="Geo Location Of Distributor"
            optional
            error={errors.geoLocation?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="geoLocation"
              render={({ field }) => (
                <GeoLocationPicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
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
                  existing={existingImages.office}
                  onRemoveExisting={(i) => removeExistingImage("office", i)}
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
                  existing={existingImages.godown}
                  onRemoveExisting={(i) => removeExistingImage("godown", i)}
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

          <Field label="Year Of Est." optional error={errors.yearOfEst?.message}>
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
                  existing={existingImages.pan}
                  onRemoveExisting={(i) => removeExistingImage("pan", i)}
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
                  existing={existingImages.gst}
                  onRemoveExisting={(i) => removeExistingImage("gst", i)}
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
                  existing={existingImages.cheque}
                  onRemoveExisting={(i) => removeExistingImage("cheque", i)}
                />
              )}
            />
          </Field>

          <Field
            label="Payment Condition"
            optional
            error={errors.paymentConditionId?.message}
          >
            <Controller
              control={control}
              name="paymentConditionId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={paymentConditionOptions}
                  placeholder={
                    paymentConditions.isLoading ? "Loading…" : "Select…"
                  }
                  searchPlaceholder="Search payment condition"
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
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
