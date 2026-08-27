import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCompanyStore } from '@/stores/company-store'

/**
 * Run `handler` whenever the active company (tenant) actually changes while the
 * screen is mounted.
 *
 * Every record id in this app is tenant-scoped, so anything pinned to one — an
 * open detail dialog, an `?data=` token, a half-filled edit form — belongs to the
 * *previous* company the moment the switcher fires. `useSelectCompany` already
 * drops the query cache; this is the other half: the screens holding an id have
 * to let go of it too, or they refetch a foreign id and 403/404.
 *
 * The first resolved company is not a switch: `selectedCompanyId` starts `null`
 * on a cold load (and after a persist rehydrate) and fills in once
 * `/me/companies` answers, so a `null → id` transition is ignored.
 */
export function useOnCompanySwitch(handler: () => void) {
  const companyId = useCompanyStore((s) => s.selectedCompanyId)

  // Kept in refs so the effect fires on a company change only — never because
  // the caller passed a fresh closure on a re-render.
  const previous = useRef(companyId)
  const latestHandler = useRef(handler)
  latestHandler.current = handler

  useEffect(() => {
    const before = previous.current
    previous.current = companyId
    if (before === null || companyId === null || before === companyId) return
    latestHandler.current()
  }, [companyId])
}

/**
 * On a company switch, leave this screen for `to` — the list it was opened from.
 *
 * For drill-downs (a detail, an edit form, a plan): the row that got the user
 * here no longer exists under the new tenant, so the honest destination is that
 * feature's list, freshly loaded for the company they just picked. `replace`
 * keeps Back from walking straight into the stale record.
 */
export function useRedirectOnCompanySwitch(to: string) {
  const navigate = useNavigate()
  useOnCompanySwitch(() => {
    void navigate({ to, replace: true })
  })
}

/**
 * On a company switch, drop the `?data=` token but stay put.
 *
 * For the top-level screens that carry an entity in their search params yet are
 * their own nav destination (beat allocation, live map): they each pick their own
 * default — the new company's first sales incharge — once the token is gone, so
 * ejecting the user to some other page would be the wrong kind of loud.
 */
export function useResetDataOnCompanySwitch() {
  const navigate = useNavigate()
  useOnCompanySwitch(() => {
    void navigate({ to: '.', search: {}, replace: true })
  })
}
