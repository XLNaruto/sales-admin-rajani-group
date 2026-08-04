import { useMemo } from 'react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { ActivityDef } from '../types'

/**
 * The day's activity, as the shared `<Combobox>`, over the server's master.
 *
 * The value is the activity **id**, because that is what the day PATCH is keyed
 * on. Working activities come first and non-working ones carry a "Not working"
 * hint — the list is flat, and that split is what changes the day's meaning, so it
 * has to survive the loss of `<optgroup>`.
 */
export function ActivitySelect({
  activities,
  value,
  onChange,
  disabled = false,
  placeholder,
  className = 'min-w-48',
}: {
  activities: ActivityDef[]
  /** Current activity id. */
  value: number
  onChange: (activityId: number) => void
  disabled?: boolean
  /**
   * Trigger text before anything is picked. The plan editor always has an
   * activity, so it needs none; a blank new row does — without it the trigger
   * renders empty and reads as a broken field next to its neighbours.
   */
  placeholder?: string
  /** Width utility for the trigger. */
  className?: string
}) {
  const options = useMemo<ComboboxOption[]>(
    () =>
      [...activities]
        .sort((a, b) => Number(b.working) - Number(a.working))
        .map((activity) => ({
          label: activity.name,
          value: String(activity.id),
          hint: activity.working ? undefined : 'Not working',
        })),
    [activities],
  )

  return (
    <Combobox
      value={value ? String(value) : ''}
      onChange={(id) => onChange(Number(id))}
      options={options}
      placeholder={placeholder}
      // A dozen rows — under the point where an in-panel filter earns its keep.
      searchable={options.length > 12}
      disabled={disabled || options.length === 0}
      aria-label="Day activity"
      // Defaults wide enough for the longest name in the master ("Distributor
      // Service", "Head Office Visit") — the panel matches the trigger's width, so
      // a narrow trigger truncates the very options being chosen between.
      className={className}
    />
  )
}
