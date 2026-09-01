/**
 * State for the Rep Day Trail.
 *
 * One (rep, day) pair, both carried in the URL's encrypted `?data=` token — the
 * screen is normally opened from a row on the Live Fleet Map, which passes the
 * day it was showing rather than defaulting to today.
 *
 * The response is the whole day and is never re-sorted or re-paged here: it
 * arrives oldest-first, which is the order the polyline is drawn in.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { decryptParams, encryptParams } from '@/lib/crypto'
import { errorCode, errorStatus } from '@/lib/api-error'
import { useOnCompanySwitch, useOpenCompanyPickerOnError } from '@/features/company'
import { useSalesInchargeSelect } from '@/features/sales-incharge'
import { useRepTrail as useRepTrailQuery } from '../api/use-location-tracking'
import {
  shiftTracked,
  simplifyPath,
  todayTracked,
  trackedDateLabel,
} from '../lib/location-format'

/** Params carried in the encrypted `?data=` token. */
interface TrailParamsToken {
  /** Sales incharge whose day is on screen. */
  id?: string
  /** `yyyy-MM-dd`. */
  date?: string
}

export function useRepTrail(data?: string) {
  const navigate = useNavigate()
  const token = useMemo<TrailParamsToken>(
    () => (data ? (decryptParams<TrailParamsToken>(data) ?? {}) : {}),
    [data],
  )

  const today = useMemo(() => todayTracked(), [])
  const trackedDate = token.date ?? today

  const inchargeSelect = useSalesInchargeSelect()
  // With nobody in the URL, read whoever the picker loaded first: the screen is
  // useless empty, and that is the person the dropdown is already showing.
  const inchargeId = token.id ?? inchargeSelect.firstValue

  /** The point the timeline and the map have in common. */
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const trail = useRepTrailQuery({ inchargeId, trackedDate })
  useOpenCompanyPickerOnError(trail.error)

  const open = useCallback(
    (id: string | undefined, date: string) => {
      setSelectedId(null)
      navigate({
        to: '/tracking/trail',
        search: { data: encryptParams({ id, date }) },
        replace: true,
      })
    },
    [navigate],
  )

  const selectIncharge = useCallback(
    (id: string) => {
      if (!id || id === inchargeId) return
      open(id, trackedDate)
    },
    [inchargeId, trackedDate, open],
  )

  const selectDate = useCallback(
    (next: string) => {
      if (!next || next === trackedDate) return
      open(inchargeId, next)
    },
    [inchargeId, trackedDate, open],
  )

  // The token pins a rep of the previous tenant — go back to the fleet map,
  // which reloads for the company just picked.
  useOnCompanySwitch(() => {
    void navigate({ to: '/tracking/live', search: {}, replace: true })
  })

  const points = useMemo(() => trail.data?.points ?? [], [trail.data])
  /** Drawn path only — every point stays available to the timeline below. */
  const path = useMemo(() => simplifyPath(points), [points])

  const selected = useMemo(
    () => points.find((point) => point.id === selectedId) ?? null,
    [points, selectedId],
  )

  const selectedOption = useMemo(
    () => inchargeSelect.options.find((option) => option.value === inchargeId),
    [inchargeSelect.options, inchargeId],
  )

  /**
   * The rep is not a rep of this company (or does not exist — the API answers
   * both the same way on purpose, so an id cannot be probed). Not a retryable
   * error, so the screen renders it as its own state.
   */
  const notFound =
    errorStatus(trail.error) === 404 && errorCode(trail.error) === 'SALES_INCHARGE_NOT_FOUND'

  return {
    inchargeId,
    /** Combobox props for the header's rep picker, plus its current value. */
    incharge: {
      ...inchargeSelect,
      value: inchargeId ?? '',
      onChange: selectIncharge,
    },
    /** The name the API returned, falling back to the picker's row. */
    inchargeName: trail.data?.salesInchargeName ?? selectedOption?.label ?? null,
    inchargeCode: selectedOption?.badge?.replace(/^#/, '') ?? null,
    trackedDate,
    trackedDateLabel: trackedDateLabel(trackedDate),
    today,
    selectDate,
    prevDate: () => selectDate(shiftTracked(trackedDate, -1)),
    nextDate: () => selectDate(shiftTracked(trackedDate, 1)),
    trail: trail.data ?? null,
    /** Every point of the day, oldest-first, exactly as returned. */
    points,
    /** The path handed to the map — thinned only if the day is unusually long. */
    path,
    /** True when the drawn line is a decimation of the recorded points. */
    pathSimplified: path.length < points.length,
    selectedId,
    setSelectedId,
    selected,
    isLoading: trail.isLoading,
    isError: trail.isError,
    error: trail.error,
    notFound,
    refresh: {
      onRefresh: () => void trail.refetch(),
      updatedAt: trail.dataUpdatedAt,
      isFetching: trail.isFetching,
    },
    /** Back to the fleet, on the same day the trail is showing. */
    backToFleet: () =>
      navigate({
        to: '/tracking/live',
        search: { data: encryptParams({ date: trackedDate }) },
      }),
  }
}
