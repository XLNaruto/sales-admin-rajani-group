import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { reverseGeocode } from '@/lib/reverse-geocode'
import { encryptParams } from '@/lib/crypto'
import { toastMutationError } from '@/lib/api-toast'
import { useFormDraft } from '@/hooks/use-form-drafts'
import { useNearestBeat } from '@/features/beat-creation'
import {
  useCreateRetailer,
  useRetailer,
  useUpdateRetailer,
} from '../api/use-retailers'
import {
  retailerSchema,
  retailerDefaults,
  RETAILER_DRAFT_KEY,
  RETAILER_FILE_FIELDS,
  type RetailerFormValues,
} from '../lib/retailer-form'
import { coordKey, splitLatLng } from '../lib/retailer-reference'
import type { GeoLabels } from '@/features/location'
import type { RetailerCreateInput } from '../types'

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
    owners: values.owners.map((o) => ({
      name: o.name,
      mobile: o.mobile,
      alternateMobile: o.alternateMobile,
      birthDate: o.birthDate,
      anniversaryDate: o.anniversaryDate,
    })),

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

    beatId: str(values.beatId),

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
 *
 * Create mode also autosaves to a local draft on every field blur, so an
 * abandoned onboarding can be resumed from the list screen's Drafts picker
 * (`draftId`). The draft is dropped once the record is actually created.
 */
export function useRetailerForm(id?: string, draftId?: string) {
  const navigate = useNavigate()
  const isEdit = !!id

  const createRetailer = useCreateRetailer()
  const updateRetailer = useUpdateRetailer()
  const detail = useRetailer(id)

  const form = useForm<RetailerFormValues>({
    resolver: zodResolver(retailerSchema),
    mode: 'onTouched',
    defaultValues: retailerDefaults as RetailerFormValues,
    // We scroll/focus the first error ourselves (see `scrollToFirstError`) so
    // custom controls (Combobox/DatePicker) are handled too.
    shouldFocusError: false,
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = form

  // Local draft autosave — create mode only; an existing record is already
  // server-backed. A brand-new draft's id is pushed into the URL so a reload
  // keeps writing to the same one instead of spawning duplicates.
  const { saveOnBlur, clearDraft, isRestoring } = useFormDraft({
    form,
    formKey: RETAILER_DRAFT_KEY,
    draftId,
    enabled: !isEdit,
    fileFields: RETAILER_FILE_FIELDS,
    describe: (values) => ({
      label: values.shopName?.trim() || 'Untitled retailer',
      summary: [values.owners?.[0]?.name, values.owners?.[0]?.mobile, values.market]
        .filter(Boolean)
        .join(' · '),
    }),
    onCreated: (newDraftId) =>
      navigate({
        to: '/retailers/create',
        search: { data: encryptParams({ draftId: newDraftId }) },
        replace: true,
      }),
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

  // Same idea for the beat select: its name, so a seeded or auto-resolved beat
  // reads properly before its own option has been paged in.
  const [beatLabel, setBeatLabel] = useState('')

  /**
   * The coordinate whose beat is already settled — seeded from the saved record,
   * restored from a draft, or auto-applied from a previous lookup. While the pin
   * sits on it the nearest-beat lookup is skipped entirely (no request) and its
   * answer is never written, which is what keeps a beat that someone already
   * decided on from being clobbered. Moving the pin unsettles it.
   */
  const settledCoordRef = useRef<string | null>(null)

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) {
      reset(detail.data.values)
      const path = detail.data.existing.shopPhotoPath.trim()
      setExistingPhoto(path ? [path] : [])
      setGeoLabels(detail.data.geoLabels)
      setBeatLabel(detail.data.beatLabel)
      // A record that already has a beat is settled where it stands — no lookup
      // runs for its saved pin. One saved without a beat (captured in the field
      // before it could be resolved, or resolved to nothing at the time) is left
      // unsettled, so opening it asks for a suggestion straight away.
      settledCoordRef.current = detail.data.values.beatId
        ? coordKey(detail.data.values.geoLocation)
        : null
    }
  }, [detail.data, reset])

  // A resumed draft settles the same way: a beat the user had already chosen is
  // left alone, a draft pinned but never resolved asks again on reopen.
  // `isRestoring` falling back to false is the point the values are in.
  const wasRestoringRef = useRef(false)
  useEffect(() => {
    if (isRestoring) {
      wasRestoringRef.current = true
      return
    }
    if (wasRestoringRef.current) {
      wasRestoringRef.current = false
      settledCoordRef.current = getValues('beatId')
        ? coordKey(getValues('geoLocation'))
        : null
    }
  }, [isRestoring, getValues])

  /** Drop the already-saved photo so the update no longer retains it. */
  const removeExistingPhoto = (index: number) =>
    setExistingPhoto((prev) => prev.filter((_, i) => i !== index))

  // Cascading territory selection — watch parents to scope child options.
  const stateId = watch('stateId')
  const zoneId = watch('zoneId')
  const districtId = watch('districtId')
  const talukaId = watch('talukaId')

  // `formatted_address` is derived, never typed: whenever the picked coordinate
  // changes, reverse-geocode it and store the label alongside the lat/lng.
  const geoLocation = watch('geoLocation')
  const formattedAddress = watch('formattedAddress')
  // The picker's one "lat, lng" string, split once for the two lookups below.
  const { latitude, longitude } = splitLatLng(geoLocation)
  useEffect(() => {
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
  }, [latitude, longitude, setValue])

  /* --------------------------- Nearest-beat prefill -------------------------
   * Pinning the shop resolves the beat it most likely belongs to, and that
   * answer is written into the (still editable) Beat select.
   *
   * The lookup only runs where its answer could actually be used — the pin sits
   * somewhere the beat isn't settled yet. So a fresh pin asks, and an edit of a
   * record that already has a beat doesn't ask at all until the pin moves. When
   * an answer does come back unresolved it leaves the field alone rather than
   * clearing it: "no beat near here" is no reason to throw away a choice.
   */
  const pinnedCoord = latitude && longitude ? `${latitude}, ${longitude}` : ''
  const beatUnsettled = !!pinnedCoord && settledCoordRef.current !== pinnedCoord

  const nearestBeat = useNearestBeat(latitude || undefined, longitude || undefined, {
    enabled: beatUnsettled,
  })
  const nearest = beatUnsettled ? nearestBeat.data : undefined

  useEffect(() => {
    // Settle against the coordinate this answer describes — not `geoLocation`,
    // which may have moved on while the lookup was in flight.
    if (!pinnedCoord || !nearest || settledCoordRef.current === pinnedCoord) return

    settledCoordRef.current = pinnedCoord
    if (!nearest.resolved || !nearest.beatId) return
    setValue('beatId', nearest.beatId, { shouldValidate: true, shouldDirty: true })
    setBeatLabel(nearest.beatName ?? '')
  }, [nearest, pinnedCoord, setValue])

  const onSubmit = handleSubmit((values) => {
    const input = toInput(values)
    const onSuccess = () => {
      // Only once the record exists — a failed request must keep the draft.
      clearDraft()
      toast.success(`${values.shopName} ${isEdit ? 'updated' : 'created'}`)
      navigate({ to: '/retailers' })
    }
    // A 409 is a business-rule conflict the user can act on (a duplicate shop
    // code, an outlet already onboarded) — show the API's own message verbatim.
    const onError = (error: unknown) =>
      toastMutationError(
        error,
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

  /** Swap the form over to another saved draft (from the in-page picker). */
  const openDraft = (nextDraftId: string) =>
    navigate({
      to: '/retailers/create',
      search: { data: encryptParams({ draftId: nextDraftId }) },
    })

  /**
   * Abandon the draft in front of us and start clean. The route doesn't remount
   * on a same-path navigation, so the form is reset by hand; dropping `data`
   * from the URL is what tells `useFormDraft` to mint a fresh draft id on the
   * next blur, leaving the old draft untouched in the list.
   */
  const startNewDraft = () => {
    reset(retailerDefaults as RetailerFormValues)
    setGeoLabels({})
    setBeatLabel('')
    settledCoordRef.current = null
    navigate({ to: '/retailers/create', search: {} })
  }

  return {
    register,
    control,
    errors,
    setValue,
    existingPhoto,
    removeExistingPhoto,
    geoLabels,
    setGeoLabels,
    /** Name of the currently-held beat, shown until its option pages in. */
    beatLabel,
    setBeatLabel,
    /**
     * The live nearest-beat lookup for the pinned coordinate — the page reads it
     * to explain where the prefilled beat came from, and to say so when nothing
     * could be resolved.
     */
    nearestBeat: {
      loading: beatUnsettled && nearestBeat.isFetching,
      /** True once a lookup has run for the current pin and found nothing. */
      unresolved: !!nearest && !nearest.resolved,
      /** True when the beat now in the field came from that lookup. */
      suggested: !!nearest?.resolved,
      distanceMetres: nearest?.resolved ? nearest.distanceMetres : null,
      /** True when the pin sits somewhere, i.e. a lookup is meaningful at all. */
      hasPin: !!pinnedCoord,
    },
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
    openDraft,
    startNewDraft,
    /** The draft this form is writing to, if any — flagged in the picker. */
    draftId,
    /** Blur handler for the `<form>` — snapshots the values into the draft. */
    saveOnBlur,
    /** True while a draft is being resumed (`?data=` carried a draft id). */
    isRestoring,
  }
}
