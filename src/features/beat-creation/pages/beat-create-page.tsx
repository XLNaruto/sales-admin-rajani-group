import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, Route, MapPin, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useSalesmen } from '@/features/sales-incharge'
import { useCreateBeat } from '../api/use-beats'
import { Field, DatePicker, MultiSelect } from '../components/form-fields'
import { OutletsEditor } from '../components/outlets-editor'
import { beatSchema, beatDefaults, type BeatFormValues } from '../lib/beat-form'
import type { BeatOutlet } from '../types'
import {
  BEAT_PROGRAMS,
  BEAT_STATUSES,
  DISTRIBUTORS,
  MARKET_SYSTEMS,
  MARKET_TYPES,
  STATES,
  VISIT_CYCLES,
  VISIT_DAYS,
  citiesByTaluka,
  districtsByZone,
  talukasByDistrict,
  toOptions,
  villagesByCity,
  zonesByState,
} from '../lib/beat-reference'

const CURRENT_YEAR = new Date().getFullYear()

/** Parse an optional numeric-text field into a number (or undefined when blank). */
const num = (v?: string) => (v && v.trim() !== '' ? Number(v) : undefined)

export function BeatCreatePage() {
  const navigate = useNavigate()
  const createBeat = useCreateBeat()
  const { data: salesmen } = useSalesmen()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BeatFormValues>({
    resolver: zodResolver(beatSchema),
    mode: 'onTouched',
    defaultValues: beatDefaults as BeatFormValues,
  })

  // Cascading territory selection — watch parents to build child options.
  const stateId = watch('stateId')
  const zoneId = watch('zoneId')
  const districtId = watch('districtId')
  const talukaId = watch('talukaId')
  const cityId = watch('cityId')

  const salesmanOptions = (salesmen ?? []).map((s) => ({ value: s.id, label: s.name }))

  const onSubmit = handleSubmit((values) => {
    const outlets: BeatOutlet[] = values.outlets.map((o, i) => ({
      retailerId: o.retailerId,
      sequence: i + 1,
      geoLat: num(o.geoLat),
      geoLng: num(o.geoLng),
      geoFenceM: num(o.geoFenceM),
    }))

    createBeat.mutate(
      {
        beatCode: values.beatCode,
        beatName: values.beatName,
        status: values.status,
        marketType: values.marketType,
        marketSystem: values.marketSystem,
        stateId: values.stateId,
        zoneId: values.zoneId,
        districtId: values.districtId,
        talukaId: values.talukaId,
        cityId: values.cityId,
        villageIds: values.villageIds ?? [],
        distributorId: values.distributorId,
        visitCycle: values.visitCycle,
        visitDays: values.visitDays,
        assignedSalesmanId: values.assignedSalesmanId,
        beatProgramId: values.beatProgramId || undefined,
        effectiveDate: values.effectiveDate,
        outlets,
      },
      {
        onSuccess: () => {
          toast.success(`${values.beatName} created`)
          navigate({ to: '/beats' })
        },
        onError: () => toast.error("Couldn't create the beat. Please try again."),
      },
    )
  })

  return (
    <div>
      <PageHeader
        title="Create Beat"
        description="Define the beat, its territory, schedule and ordered outlet route."
        actions={
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate({ to: '/beats' })}
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
          <h2 className="text-base font-semibold text-foreground">Beat details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3 xl:grid-cols-4">
          {/* --------------------------- Beat details --------------------------- */}
          <FormSection
            icon={Route}
            title="Beat Details"
            description="Name, code and market classification."
            className="mt-0"
          />

          <Field label="Beat Code" error={errors.beatCode?.message}>
            <Input placeholder="e.g. BT-RJK-01" {...register('beatCode')} />
          </Field>

          <Field label="Beat Name" error={errors.beatName?.message}>
            <Input placeholder="e.g. Rajkot City Central" {...register('beatName')} />
          </Field>

          <Field label="Market Type" error={errors.marketType?.message}>
            <Controller
              control={control}
              name="marketType"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={MARKET_TYPES}
                  placeholder="Select market type"
                  searchPlaceholder="Search market type"
                />
              )}
            />
          </Field>

          <Field label="Market System" error={errors.marketSystem?.message}>
            <Controller
              control={control}
              name="marketSystem"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={MARKET_SYSTEMS}
                  placeholder="Select market system"
                  searchPlaceholder="Search market system"
                />
              )}
            />
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={BEAT_STATUSES}
                  placeholder="Select status"
                  searchable={false}
                />
              )}
            />
          </Field>

          {/* ---------------------- Territory & distributor --------------------- */}
          <div className="md:col-span-3 xl:col-span-4">
            <FormSection
              icon={MapPin}
              title="Territory & Distributor"
              description="Geography served and the linked distributor."
              className="mb-4"
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
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
                        setValue('villageIds', [])
                      }}
                      options={toOptions(STATES)}
                      placeholder="Select state"
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
                      value={field.value ?? ''}
                      onChange={(v) => {
                        field.onChange(v)
                        setValue('districtId', '')
                        setValue('talukaId', '')
                        setValue('cityId', '')
                        setValue('villageIds', [])
                      }}
                      options={toOptions(zonesByState(stateId))}
                      placeholder={stateId ? 'Select zone' : 'Select a state first'}
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
                      value={field.value ?? ''}
                      onChange={(v) => {
                        field.onChange(v)
                        setValue('talukaId', '')
                        setValue('cityId', '')
                        setValue('villageIds', [])
                      }}
                      options={toOptions(districtsByZone(zoneId))}
                      placeholder={zoneId ? 'Select district' : 'Select a zone first'}
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
                      value={field.value ?? ''}
                      onChange={(v) => {
                        field.onChange(v)
                        setValue('cityId', '')
                        setValue('villageIds', [])
                      }}
                      options={toOptions(talukasByDistrict(districtId))}
                      placeholder={districtId ? 'Select taluka' : 'Select a district first'}
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
                      value={field.value ?? ''}
                      onChange={(v) => {
                        field.onChange(v)
                        setValue('villageIds', [])
                      }}
                      options={toOptions(citiesByTaluka(talukaId))}
                      placeholder={talukaId ? 'Select city' : 'Select a taluka first'}
                      searchPlaceholder="Search city"
                    />
                  )}
                />
              </Field>

              <Field label="Villages" optional error={errors.villageIds?.message}>
                <Controller
                  control={control}
                  name="villageIds"
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                      options={toOptions(villagesByCity(cityId))}
                      placeholder={cityId ? 'Select villages' : 'Select a city first'}
                      searchPlaceholder="Search village"
                    />
                  )}
                />
              </Field>

              <Field label="Distributor" error={errors.distributorId?.message}>
                <Controller
                  control={control}
                  name="distributorId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={toOptions(DISTRIBUTORS)}
                      placeholder="Select distributor"
                      searchPlaceholder="Search distributor"
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* ---------------------- Schedule & allocation ----------------------- */}
          <div className="md:col-span-3 xl:col-span-4">
            <FormSection
              icon={CalendarClock}
              title="Schedule & Allocation"
              description="Visit cadence and the salesman on this beat."
              className="mb-4"
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
              <Field label="Visit Cycle" error={errors.visitCycle?.message}>
                <Controller
                  control={control}
                  name="visitCycle"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={VISIT_CYCLES}
                      placeholder="Select visit cycle"
                      searchable={false}
                    />
                  )}
                />
              </Field>

              <Field label="Visit Days" error={errors.visitDays?.message}>
                <Controller
                  control={control}
                  name="visitDays"
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                      options={VISIT_DAYS.map((d) => ({ value: d, label: d }))}
                      placeholder="Select days"
                      searchPlaceholder="Search day"
                    />
                  )}
                />
              </Field>

              <Field label="Assigned Salesman" error={errors.assignedSalesmanId?.message}>
                <Controller
                  control={control}
                  name="assignedSalesmanId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={salesmanOptions}
                      placeholder="Assign a salesman"
                      searchPlaceholder="Search salesman"
                    />
                  )}
                />
              </Field>

              <Field label="Beat Program" optional error={errors.beatProgramId?.message}>
                <Controller
                  control={control}
                  name="beatProgramId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={toOptions(BEAT_PROGRAMS)}
                      placeholder="Select program"
                      searchPlaceholder="Search program"
                    />
                  )}
                />
              </Field>

              <Field label="Effective Date" error={errors.effectiveDate?.message}>
                <Controller
                  control={control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      fromYear={2020}
                      toYear={CURRENT_YEAR + 2}
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* -------------------------- Outlets & route ------------------------- */}
          <OutletsEditor control={control} register={register} errors={errors} />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate({ to: '/beats' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer text-white"
            disabled={createBeat.isPending}
          >
            {createBeat.isPending ? 'Saving…' : 'Create beat'}
          </Button>
        </div>
      </form>
    </div>
  )
}
