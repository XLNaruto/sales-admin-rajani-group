import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { reverseGeocode } from '@/lib/reverse-geocode'
import {
  useCreateRetailer,
  useRetailer,
  useUpdateRetailer,
} from '../api/use-retailers'
import {
  retailerSchema,
  retailerDefaults,
  type RetailerFormValues,
} from '../lib/retailer-form'
import { splitLatLng } from '../lib/retailer-reference'
import type { GeoLabels } from '@/features/location'
import type { RetailerCreateInput } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

/** Latest allowed birth date — today shifted back 18 years, so anyone younger
 *  than 18 can't be selected. */
const MAX_BIRTH_DATE = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d
})()

/** Today — the latest selectable date, so future anniversaries can't be picked. */
const TODAY = new Date()

/** Parse a 'yyyy-MM-dd' form value into a local Date (or undefined when blank),
 *  for use as a date-picker bound. */
const toDate = (v?: string) => {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : undefined
}

/** Trim an optional text field, collapsing blanks to undefined. */
const str = (v?: string) => (v && v.trim() !== '' ? v.trim() : undefined)

/**
 * On an invalid submit, bring the topmost errored field into view and focus its
 * control. Targets the `[data-error]` message the shared `Field` renders, so it
 * works for native inputs and custom controls (Combobox/DatePicker) alike.
 */
function scrollToFirstError() {
  requestAnimationFrame(() => {
    const message = document.querySelector<HTMLElement>('[data-error]')
    if (!message) return
    message.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const control = message.parentElement?.querySelector<HTMLElement>(
      'input, textarea, select, button, [tabindex]',
    )
    control?.focus({ preventScroll: true })
  })
}

/** Map validated form values into the create/update request payload. */
function toInput(values: RetailerFormValues): RetailerCreateInput {
  // The picker stores one "lat, lng" string; the API keeps two columns.
  const { latitude, longitude } = splitLatLng(values.geoLocation)
  return {
    code: str(values.code),
    shopName: values.shopName,
    ownerName: str(values.ownerName),
    ownerMobile: values.ownerMobile,
    alternateMobile: str(values.alternateMobile),
    ownerBirthDate: str(values.ownerBirthDate),
    ownerAnniversaryDate: str(values.ownerAnniversaryDate),

    addressLine: str(values.addressLine),
    address: str(values.address),
    formattedAddress: str(values.formattedAddress),
    landmark: str(values.landmark),
    market: str(values.market),
    stateId: values.stateId,
    zoneId: values.zoneId,
    districtId: values.districtId,
    talukaId: values.talukaId,
    cityId: values.cityId,
    pincode: str(values.pincode),

    latitude: str(latitude),
    longitude: str(longitude),

    outletTypeId: str(values.outletTypeId),
    shopPhoto: values.shopPhoto ?? [],
  }
}

/**
 * Owns the retailer form for both create and edit. In edit mode (`id` set) it
 * loads the record via GET, seeds the form, and submits via PATCH — merging a
 * newly-picked photo with the path already saved so an untouched image
 * survives. Create mode POSTs a fresh record. The page consumes this and only
 * lays out fields.
 */
export function useRetailerForm(id?: string) {
  const navigate = useNavigate()
  const isEdit = !!id

  const createRetailer = useCreateRetailer()
  const updateRetailer = useUpdateRetailer()
  const detail = useRetailer(id)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RetailerFormValues>({
    resolver: zodResolver(retailerSchema),
    mode: 'onTouched',
    defaultValues: retailerDefaults as RetailerFormValues,
    // We scroll/focus the first error ourselves (see `scrollToFirstError`) so
    // custom controls (Combobox/DatePicker) are handled too.
    shouldFocusError: false,
  })

  // The shop-photo path already saved on the record — a single storage key, held
  // as a one-item list because that's the shape `FileInput` renders. Reactive so
  // removing it drops it from the payload.
  const [existingPhoto, setExistingPhoto] = useState<string[]>([])

  // Names for the currently-held geography ids. The five selects are lazy and
  // parent-scoped, so an id can be set before its own option has been fetched —
  // these keep the right name in the trigger meanwhile. Seeded from the record
  // in edit mode, and rewritten by the page when a city back-fills its ancestry.
  const [geoLabels, setGeoLabels] = useState<GeoLabels>({})

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values)
      const path = detail.data.existing.shopPhotoPath.trim()
      setExistingPhoto(path ? [path] : [])
      setGeoLabels(detail.data.geoLabels)
    }
  }, [detail.data, reset])

  /** Drop the already-saved photo so the update no longer retains it. */
  const removeExistingPhoto = (index: number) =>
    setExistingPhoto((prev) => prev.filter((_, i) => i !== index))

  // Owner's birth date bounds the anniversary picker.
  const birthDate = toDate(watch('ownerBirthDate'))

  // Cascading territory selection — watch parents to scope child options.
  const stateId = watch('stateId')
  const zoneId = watch('zoneId')
  const districtId = watch('districtId')
  const talukaId = watch('talukaId')

  // `formatted_address` is derived, never typed: whenever the picked coordinate
  // changes, reverse-geocode it and store the label alongside the lat/lng.
  const geoLocation = watch('geoLocation')
  const formattedAddress = watch('formattedAddress')
  useEffect(() => {
    const { latitude, longitude } = splitLatLng(geoLocation)
    if (!latitude || !longitude) {
      if (formattedAddress) setValue('formattedAddress', '')
      return
    }
    let active = true
    reverseGeocode({ lat: Number(latitude), lng: Number(longitude) }).then((address) => {
      if (active && address) setValue('formattedAddress', address)
    })
    return () => {
      active = false
    }
    // `formattedAddress` is written here, not read as a trigger — including it
    // in the deps would re-run the effect on every resolved lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoLocation, setValue])

  const onSubmit = handleSubmit((values) => {
    const input = toInput(values)
    const onSuccess = () => {
      toast.success(`${values.shopName} ${isEdit ? 'updated' : 'created'}`)
      navigate({ to: '/retailers' })
    }
    const onError = () =>
      toast.error(
        `Couldn't ${isEdit ? 'update' : 'create'} the retailer. Please try again.`,
      )

    if (isEdit && id) {
      updateRetailer.mutate(
        { ...input, id, existing: { shopPhotoPath: existingPhoto[0] ?? '' } },
        { onSuccess, onError },
      )
    } else {
      createRetailer.mutate(input, { onSuccess, onError })
    }
  }, scrollToFirstError)

  const goBack = () => navigate({ to: '/retailers' })

  return {
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
    talukaId,
    /** Reverse-geocoded label for the picked coordinate (read-only display). */
    formattedAddress,
    onSubmit,
    isEdit,
    isPending: createRetailer.isPending || updateRetailer.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && detail.isError,
    goBack,
    currentYear: CURRENT_YEAR,
    maxBirthDate: MAX_BIRTH_DATE,
    maxDate: TODAY,
    /** Owner's birth date as a Date — lower bound for the anniversary picker. */
    birthDate,
  }
}
