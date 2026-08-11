import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { queryKeys } from '@/lib/query-keys'
import {
  clearFormDrafts,
  listDrafts,
  loadDraft,
  removeDraft,
  saveDraft,
  type DraftSummary,
} from '@/lib/form-drafts'

/**
 * The two halves of the draft system:
 *
 *  • `useDrafts` — read side, for the list screen's "Drafts (n)" button.
 *  • `useFormDraft` — write side, plugged into a feature's `use-<x>-form` hook.
 *
 * Drafts are device-local (IndexedDB), never server state; TanStack Query is
 * used only as the async cache so the counter stays live across routes.
 */

/** Every saved draft for one form kind, plus the delete action. */
export function useDrafts(formKey: string) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.drafts.list(formKey),
    queryFn: () => listDrafts(formKey),
    // A local IndexedDB read is cheap, and the count must never lag behind a
    // draft saved on another route — override the global 30s staleTime.
    staleTime: 0,
  })

  const remove = useMutation({
    mutationFn: (id: string) => removeDraft(formKey, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(formKey) }),
  })

  const clearAll = useMutation({
    mutationFn: () => clearFormDrafts(formKey),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(formKey) }),
  })

  return {
    drafts: data ?? [],
    count: data?.length ?? 0,
    isLoading,
    remove: remove.mutate,
    isRemoving: remove.isPending,
    clearAll: clearAll.mutate,
    isClearing: clearAll.isPending,
  }
}

export type { DraftSummary }

interface UseFormDraftOptions<V extends FieldValues> {
  form: UseFormReturn<V>
  /** Identifies the form kind, e.g. `sales-incharge:create`. */
  formKey: string
  /** Draft id from the URL — resumes that draft instead of starting a new one. */
  draftId?: string
  /** Off in edit mode: an existing record is server-backed, not a draft. */
  enabled?: boolean
  /** Names of the `File` fields, so they're persisted alongside the values. */
  fileFields?: string[]
  /** Builds the two lines shown for this draft in the list. */
  describe: (values: V) => { label: string; summary: string }
  /**
   * Fired once, with the id of a freshly-created draft, so the caller can put
   * it in the URL — a reload or a trip back to the list then resumes the same
   * draft instead of spawning duplicates.
   */
  onCreated?: (id: string) => void
}

/** Is there anything worth saving? Keeps tabbing through a blank form quiet. */
function hasContent(values: FieldValues): boolean {
  return Object.values(values).some((value) => {
    if (value instanceof File) return true
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim() !== ''
    return typeof value === 'number'
  })
}

/** Idle gap after the last edit before a change-triggered save runs. */
const SAVE_DEBOUNCE_MS = 700

/**
 * Autosaves a create form as a local draft and restores one on demand.
 *
 * Saves happen on field blur (`saveOnBlur`, wired to the `<form>`) AND on a
 * debounced value change. The change watcher isn't a nicety — blur alone loses
 * edits made in popover controls. Clicking an option in the MultiSelect /
 * Combobox moves focus to that option's button on `mousedown`, so the blur it
 * triggers runs *before* the click updates the value (the save lags one pick
 * behind), and dismissing the panel unmounts the focused button, which fires no
 * `focusout` at all. Picking two companies would leave one in the draft. Watching
 * values closes both holes for every control, files included.
 *
 * The caller clears the draft from its submit `onSuccess` — a failed request
 * must keep it — after which this hook stops saving, so a blur fired on the way
 * out can't resurrect the draft it just deleted.
 */
export function useFormDraft<V extends FieldValues>({
  form,
  formKey,
  draftId,
  enabled = true,
  fileFields = [],
  describe,
  onCreated,
}: UseFormDraftOptions<V>) {
  const queryClient = useQueryClient()

  // Read during render on purpose: react-hook-form's `formState` is a proxy
  // that only starts tracking a key once something has read it, so touching
  // `dirtyFields` here is what makes the check inside `save` reliable from the
  // very first edit.
  void form.formState.dirtyFields

  // The draft being written. Starts as the URL's id and is filled in by the
  // first save when the form was opened fresh.
  const idRef = useRef<string | undefined>(draftId)
  const [isRestoring, setIsRestoring] = useState(Boolean(enabled && draftId))

  // Options are read inside a stable callback — hold them in refs so a new
  // inline `describe`/`onCreated` on each render doesn't rebuild the handler.
  const optionsRef = useRef({ describe, onCreated, fileFields, enabled })
  optionsRef.current = { describe, onCreated, fileFields, enabled }

  // Saves are serialized. Two quick blurs would otherwise both read the bucket
  // and the slower write would clobber the faster one.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  // Set only when THIS hook minted the draft id (and put it in the URL), so the
  // restore effect below doesn't then reset the form out from under the user.
  const selfCreatedRef = useRef<string | undefined>(undefined)
  // Latched by `clearDraft`: the record now exists on the server, so nothing
  // that fires while the page tears down may write a draft again.
  const stoppedRef = useRef(false)
  // The debounced change-save: its timer, and whether one is owed (so unmount
  // can flush it instead of dropping the user's last edit).
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingRef = useRef(false)

  // Seed the form from the draft named in the URL.
  useEffect(() => {
    if (!enabled || !draftId || selfCreatedRef.current === draftId) return
    idRef.current = draftId
    stoppedRef.current = false
    setIsRestoring(true)

    let active = true
    loadDraft<V>(formKey, draftId)
      .then((draft) => {
        if (!active) return
        // Merge over the defaults so a field added since the draft was written
        // keeps its default instead of arriving undefined.
        if (draft) form.reset({ ...form.getValues(), ...draft.values })
      })
      // Deliberately NOT gated on `active`: under StrictMode the first pass is
      // torn down immediately, and skipping this would leave the page stuck on
      // "Restoring your draft…" forever.
      .finally(() => setIsRestoring(false))

    return () => {
      active = false
    }
  }, [enabled, draftId, formKey, form])

  // Going from a draft back to a blank form (the id dropped out of the URL)
  // must start a NEW draft — otherwise the next blur would overwrite the draft
  // the user just stepped away from.
  useEffect(() => {
    if (draftId) return
    idRef.current = undefined
    selfCreatedRef.current = undefined
  }, [draftId])

  const save = useCallback(() => {
    const { describe, onCreated, fileFields, enabled } = optionsRef.current
    if (!enabled || stoppedRef.current) return

    queueRef.current = queueRef.current.then(async () => {
      const values = form.getValues()
      // Nothing edited yet — a form whose defaults are non-empty (a status of
      // "active", say) would otherwise park a blank draft on the first blur.
      if (Object.keys(form.formState.dirtyFields).length === 0) return
      if (!hasContent(values)) return

      const id = await saveDraft<V>({
        formKey,
        id: idRef.current,
        values,
        fileFields,
        ...describe(values),
      })

      if (!idRef.current) {
        idRef.current = id
        selfCreatedRef.current = id // this hook wrote it; don't re-restore it
        onCreated?.(id)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(formKey) })
    })
  }, [form, formKey, queryClient])

  /** Cancel an owed change-save — the caller is about to save right now. */
  const cancelPending = useCallback(() => {
    clearTimeout(timerRef.current)
    pendingRef.current = false
  }, [])

  /** Blur handler for the `<form>` — focusout bubbles, so one listener covers
   *  native inputs and the custom Combobox / DatePicker controls alike. */
  const saveOnBlur = useCallback(() => {
    if (isRestoring) return
    cancelPending()
    save()
  }, [cancelPending, isRestoring, save])

  // Values are the reliable trigger; blur is only the eager one. Debounced so a
  // burst of keystrokes (or of multi-select toggles) collapses into one write.
  useEffect(() => {
    if (!enabled) return
    const subscription = form.watch((_values, { name }) => {
      // A nameless emission is a `reset` — restoring a draft, not editing one.
      if (!name || stoppedRef.current) return
      pendingRef.current = true
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        pendingRef.current = false
        save()
      }, SAVE_DEBOUNCE_MS)
    })
    return () => {
      subscription.unsubscribe()
      clearTimeout(timerRef.current)
    }
  }, [enabled, form, save])

  // Navigating away mid-debounce must not lose the last edit — flush it. Safe
  // after unmount: the write is a detached promise, not React state.
  useEffect(
    () => () => {
      if (!pendingRef.current) return
      pendingRef.current = false
      save()
    },
    [save],
  )

  /** Drop the draft — call from the submit `onSuccess`, never on failure. */
  const clearDraft = useCallback(() => {
    // Latch first: the unmount flush that follows the post-submit navigate must
    // not re-create the draft under a fresh id.
    stoppedRef.current = true
    cancelPending()
    const id = idRef.current
    if (!id) return
    idRef.current = undefined
    queueRef.current = queueRef.current
      .then(() => removeDraft(formKey, id))
      .then(() =>
        queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(formKey) }),
      )
  }, [cancelPending, formKey, queryClient])

  return { saveOnBlur, clearDraft, isRestoring }
}
