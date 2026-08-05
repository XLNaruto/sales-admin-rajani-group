import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * "How many days" — the count field on every allocation bucket.
 *
 * It exists because the obvious version is unusable. Clamping straight off the
 * event (`Math.max(1, Number(e.target.value))`) means clearing the box yields `''`
 * → `0` → `1`, so the digit **reappears the moment you delete it** and anything
 * typed next lands beside it: emptying a `1` and typing `20` gives `120`. The field
 * has to be allowed to be empty for as long as the user is mid-edit.
 *
 * So the text is local state and the committed number is the caller's:
 *
 * - **Empty is a legal transient.** Nothing is committed for it, and the caller
 *   keeps the last good value — so the running total above never reads as a lie.
 * - **The ceiling bites immediately.** Type `40` into a 31-day month and the field
 *   reads `31` there and then, because a number the month cannot hold is not a state
 *   worth letting someone finish typing.
 * - **The floor waits for blur.** The opposite call, and for the same reason as the
 *   empty box: snapping a lone `0` up to `1` would eat the first keystroke of `05`.
 * - **Blur settles it.** The text snaps to whatever was actually committed, which is
 *   where a lone `0` or an emptied box gets undone.
 */
export function DayCountInput({
  value,
  max,
  min = 1,
  invalid = false,
  disabled = false,
  ariaLabel,
  onChange,
  className,
}: {
  /** The committed count. */
  value: number
  /** Upper bound. Applied on every keystroke, so the field can never read past it. */
  max?: number
  /** Lower bound. Applied on blur only — see the note above on the empty box. */
  min?: number
  /** Marks the field as part of a total that does not add up. */
  invalid?: boolean
  disabled?: boolean
  ariaLabel: string
  onChange: (daysCount: number) => void
  className?: string
}) {
  const [text, setText] = useState(String(value))
  const focused = useRef(false)

  // Follow the committed value when it moves underneath us — a discard, a fresh
  // plan, another row shrinking the ceiling. Skipped while focused, or it would
  // overwrite what is being typed.
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  /**
   * Commit `raw` if it parses, and answer with what the count now *is*.
   *
   * The return value matters: `onChange` only schedules a parent render, so `value`
   * is still the old one for the rest of this handler. Blur has to snap the text to
   * the number it just committed, not to the stale prop.
   */
  const commit = (raw: string): number => {
    const n = Number(raw)
    if (raw === '' || !Number.isFinite(n)) return value
    const clamped = Math.min(Math.max(min, Math.trunc(n)), max ?? Number.MAX_SAFE_INTEGER)
    if (clamped !== value) onChange(clamped)
    return clamped
  }

  return (
    <Input
      // `text`, not `number`: a number input reports `''` for "20e" and other
      // half-typed states, which makes an empty box indistinguishable from junk.
      // `inputMode` still brings up the numeric keypad.
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        // Digits only, so there is no state the commit has to reject.
        const typed = e.target.value.replace(/\D/g, '')
        // Show the ceiling the moment it bites — but only the ceiling. Clamping the
        // floor here is what re-creates the bug this component exists to fix.
        const capped =
          typed !== '' && max != null && Number(typed) > max ? String(max) : typed
        setText(capped)
        commit(capped)
      }}
      onBlur={() => {
        focused.current = false
        // Snap to what landed: shows the clamp, and restores the count when the box
        // was left empty.
        setText(String(commit(text)))
      }}
      className={cn(
        'w-16 text-center',
        invalid && 'border-destructive text-destructive focus-visible:ring-destructive',
        className,
      )}
    />
  )
}
