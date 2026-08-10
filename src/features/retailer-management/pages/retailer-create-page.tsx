import { Controller } from 'react-hook-form'
import { ArrowLeft, MapPin, Store, Tag } from 'lucide-react'
import { decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { DraftsButton } from '@/components/common/drafts-button'
import { FormSection } from '@/components/common/form-section'
import { FileInput } from '@/components/common/file-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Field } from '@/features/beat-creation'
import { GeoLocationPicker } from '@/components/maps/geo-location-picker'
import {
  useCitySelect,
  useDistrictSelect,
  useStateSelect,
  useTalukaSelect,
  useZoneSelect,
} from '@/features/location'
import { OwnerPartnersField } from '../components/owner-partners-field'
import { useRetailerForm } from '../hooks/use-retailer-form'
import { RETAILER_DRAFT_KEY } from '../lib/retailer-form'
import { useOutletTypeOptions } from '../hooks/use-retailer-selects'

/** Parse a string form id into the numeric id the location API expects. */
const toId = (v?: string) => (v ? Number(v) : undefined)

/** Shared class list for the multi-line address inputs. */
const TEXTAREA_CLASS =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring'

interface RetailerCreatePageProps {
  /**
   * Encrypted params from the `?data=` search param. An `id` switches the page
   * into edit mode (GET to seed, PATCH to save); a `draftId` resumes a locally
   * saved draft. Neither → a fresh create. The same page and form handle all
   * three.
   */
  data?: string
}

export function RetailerCreatePage({ data }: RetailerCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const params = data
    ? decryptParams<{ id?: string | number; draftId?: string }>(data)
    : null
  const id = params?.id != null ? String(params.id) : ''
  const draftId = params?.draftId

  const {
    register,
    control,
    errors,
    setValue,
    existingPhoto,
    removeExistingPhoto,
    geoLabels,
    setGeoLabels,
    stateId,
    zoneId,
    districtId,
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
  } = useRetailerForm(id || undefined, draftId)

  const title = isEdit ? 'Edit Retailer' : 'Add Retailer'
  const description = isEdit
    ? "Update the retailer's shop, owner, address and beat mapping."
    : draftId
      ? 'Carrying on from a saved draft. Changes stay on this device until you submit.'
      : 'Onboard a new retail outlet with shop, owner, address and beat mapping.'
  const submitLabel = isEdit ? 'Update Retailer' : 'Save Retailer'

  // Cascading geography masters — each level is a scroll-lazy, server-searched
  // dropdown scoped to its parent's id.
  const stateSelect = useStateSelect()
  const zoneSelect = useZoneSelect(toId(stateId))
  const districtSelect = useDistrictSelect(toId(zoneId))
  const talukaSelect = useTalukaSelect(toId(districtId))
  // Deliberately unscoped: no `taluka_id` is ever sent, so the dropdown always
  // offers (and server-searches) every city, whatever the levels above it hold.
  // That's what makes the territory settable bottom-up — pick a city and its
  // ancestry fills in. `alwaysEnabled` is required because the query otherwise
  // idles while `taluka_id` is absent.
  const citySelect = useCitySelect(undefined, { alwaysEnabled: true })

  /**
   * Picking a city sets taluka → district → zone → state from the same row the
   * cities API returns (it carries the full ancestry), so the user only has to
   * choose one field. Choosing a level manually clears the back-filled names
   * below it, since those selects go back to driving themselves.
   *
   * The back-filled levels are written with `shouldValidate` so a "Select a
   * district" style error left over from a failed submit clears the moment the
   * city supplies the value — `setValue` alone doesn't re-run validation.
   */
  const onCityChange = (value: string, onChange: (v: string) => void) => {
    onChange(value)

    const city = citySelect.items.find((c) => String(c.id) === value)
    if (!city) {
      setGeoLabels({})
      return
    }

    const fill = { shouldValidate: true, shouldDirty: true } as const
    if (city.stateId) setValue('stateId', String(city.stateId), fill)
    if (city.zoneId) setValue('zoneId', String(city.zoneId), fill)
    if (city.districtId) setValue('districtId', String(city.districtId), fill)
    setValue('talukaId', String(city.talukaId), fill)

    setGeoLabels({
      stateId: city.stateName ?? undefined,
      zoneId: city.zoneName ?? undefined,
      districtId: city.districtName ?? undefined,
      talukaId: city.talukaName ?? undefined,
      cityId: city.name,
    })
  }

  const outletTypes = useOutletTypeOptions()

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
            ? 'Restoring your draft…'
            : isError
              ? "Couldn't load this retailer. Please go back and try again."
              : 'Loading retailer…'}
        </div>
      </div>
    )
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
                formKey={RETAILER_DRAFT_KEY}
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
          {/* ------------------------ Shop & owner ------------------------ */}
          <FormSection
            icon={Store}
            title="Shop & Owner Details"
            description="Identity and contact information of the outlet."
            className="mt-0"
          />

          <Field label="Shop Name" error={errors.shopName?.message}>
            <Input placeholder="Shop Name" {...register('shopName')} />
          </Field>

          {/* Every owner/partner of the outlet — managed in its own modal since
              a shop can have several, each with contact + greeting dates. */}
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
                    ? 'Some owner details are incomplete. Open “Manage Owners” to fix them.'
                    : undefined)
                }
              />
            )}
          />

          {/* ---------------------- Address -------------------- */}
          <FormSection
            icon={MapPin}
            title="Address"
            description="Where the outlet sits — the pinned location decides its beat."
          />

          <Field label="Address Line" optional error={errors.addressLine?.message}>
            <textarea
              rows={2}
              placeholder="Shop no., street, area"
              className={TEXTAREA_CLASS}
              {...register('addressLine')}
            />
          </Field>

          <Field label="Full Address" optional error={errors.address?.message}>
            <textarea
              rows={2}
              placeholder="Full Address"
              className={TEXTAREA_CLASS}
              {...register('address')}
            />
          </Field>

          <Field label="Landmark" optional error={errors.landmark?.message}>
            <Input placeholder="Nearby landmark" {...register('landmark')} />
          </Field>

          <Field label="Market" optional error={errors.market?.message}>
            <Input placeholder="Market / trade area" {...register('market')} />
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
                  value={field.value ?? ''}
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
                  value={field.value ?? ''}
                  onChange={(v) => {
                    field.onChange(v)
                    setValue('cityId', '')
                    setGeoLabels((l) => ({
                      stateId: l.stateId,
                      zoneId: l.zoneId,
                      districtId: l.districtId,
                    }))
                  }}
                  fallbackLabel={geoLabels.talukaId}
                  options={talukaSelect.options}
                  onScrollEnd={talukaSelect.onScrollEnd}
                  loading={talukaSelect.loading}
                  onSearchChange={talukaSelect.onSearchChange}
                  placeholder={districtId ? 'Select…' : 'Pick a city, or a district first'}
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
                  value={field.value ?? ''}
                  onChange={(v) => {
                    field.onChange(v)
                    setValue('talukaId', '')
                    setValue('cityId', '')
                    setGeoLabels((l) => ({ stateId: l.stateId, zoneId: l.zoneId }))
                  }}
                  fallbackLabel={geoLabels.districtId}
                  options={districtSelect.options}
                  onScrollEnd={districtSelect.onScrollEnd}
                  loading={districtSelect.loading}
                  onSearchChange={districtSelect.onSearchChange}
                  placeholder={zoneId ? 'Select…' : 'Pick a city, or a zone first'}
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
                  value={field.value ?? ''}
                  onChange={(v) => {
                    field.onChange(v)
                    setValue('districtId', '')
                    setValue('talukaId', '')
                    setValue('cityId', '')
                    setGeoLabels((l) => ({ stateId: l.stateId }))
                  }}
                  fallbackLabel={geoLabels.zoneId}
                  options={zoneSelect.options}
                  onScrollEnd={zoneSelect.onScrollEnd}
                  loading={zoneSelect.loading}
                  onSearchChange={zoneSelect.onSearchChange}
                  placeholder={stateId ? 'Select…' : 'Pick a city, or a state first'}
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
                  value={field.value ?? ''}
                  onChange={(v) => {
                    field.onChange(v)
                    setValue('zoneId', '')
                    setValue('districtId', '')
                    setValue('talukaId', '')
                    setValue('cityId', '')
                    setGeoLabels({})
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
            <Input inputMode="numeric" placeholder="6-digit pincode" {...register('pincode')} />
          </Field>

          {/* No beat picker: the API assigns the beat nearest the pinned
              coordinates (within 25 km) and derives the distributor from it.
              The picker shows the resolved address itself, so no `hint` here —
              `formatted_address` is still captured and sent on submit. */}
          <Field
            label="Geo Location Of Shop"
            optional
            hint="The nearest beat (and its distributor) is assigned from this location."
            error={errors.geoLocation?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="geoLocation"
              render={({ field }) => (
                <GeoLocationPicker value={field.value ?? ''} onChange={field.onChange} />
              )}
            />
          </Field>

          {/* --------------------- Classification & photo ------------------ */}
          <FormSection
            icon={Tag}
            title="Classification & Photo"
            description="Outlet type and the shop front image."
          />

          <Field label="Outlet Type" optional error={errors.outletTypeId?.message}>
            <Controller
              control={control}
              name="outletTypeId"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={outletTypes.options}
                  placeholder={outletTypes.loading ? 'Loading…' : 'Select…'}
                  searchPlaceholder="Search outlet type"
                />
              )}
            />
          </Field>

          <Field label="Shop Photo" optional error={errors.shopPhoto?.message}>
            <Controller
              control={control}
              name="shopPhoto"
              render={({ field }) => (
                <FileInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  accept="image/*"
                  existing={existingPhoto}
                  onRemoveExisting={removeExistingPhoto}
                />
              )}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={goBack}>
            Cancel
          </Button>
          <Button type="submit" className="cursor-pointer text-white" disabled={isPending}>
            {isPending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}
