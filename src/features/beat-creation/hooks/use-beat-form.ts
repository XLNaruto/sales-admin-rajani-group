import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSalesmen } from '@/features/sales-incharge'
import { useCreateBeat } from '../api/use-beats'
import { beatSchema, beatDefaults, type BeatFormValues } from '../lib/beat-form'
import type { BeatOutlet } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

/** Parse an optional numeric-text field into a number (or undefined when blank). */
const num = (v?: string) => (v && v.trim() !== '' ? Number(v) : undefined)

/**
 * Owns the create-beat form: validation wiring, the create mutation, the
 * cascading territory selection, salesman options, the submit → map → navigate
 * flow and the date-picker year bounds. The page consumes this and only lays
 * out fields.
 */
export function useBeatForm() {
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

  const goBack = () => navigate({ to: '/beats' })

  return {
    register,
    control,
    errors,
    setValue,
    onSubmit,
    isPending: createBeat.isPending,
    goBack,
    salesmanOptions,
    stateId,
    zoneId,
    districtId,
    talukaId,
    cityId,
    currentYear: CURRENT_YEAR,
  }
}
