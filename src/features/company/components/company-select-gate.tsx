import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Check, CheckCircle2, Loader2, LogOut } from 'lucide-react'
import { useLogout } from '@/features/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useCompanies } from '../api/use-companies'
import { useSelectCompany } from '../api/use-select-company'

/**
 * Post-login company gate. When the admin belongs to more than one company and
 * hasn't picked one (`requires_selection`), this blocks the app with a
 * non-dismissable modal until a company is chosen. Single-company admins (and
 * anyone who's already selected) never see it — `requires_selection` is false.
 *
 * Selection is two-step: pick a company to highlight it, then Confirm. A Log out
 * escape hatch is offered for anyone who reached the wrong account.
 *
 * Mounted inside the authenticated shell; shares the `/me/companies` cache with
 * the topbar switcher, so it costs no extra request.
 */
export function CompanySelectGate() {
  const { data } = useCompanies()
  const selectCompany = useSelectCompany()
  const logout = useLogout()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Mirror the topbar's sign-out: clear the session, then send the user to the
  // login screen. Without the explicit navigate the modal stays put after the
  // auth state clears.
  const handleLogout = () =>
    logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })

  if (!data?.requiresSelection) return null

  const busy = selectCompany.isPending || logout.isPending

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showClose={false} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle>Select Company</DialogTitle>
              <DialogDescription>Choose your company</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
          {data.companies.map((company) => {
            const isSelected = selectedId === company.id
            return (
              <button
                key={company.id}
                type="button"
                disabled={busy}
                onClick={() => setSelectedId(company.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-background hover:border-primary/50 hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-md text-xs font-semibold uppercase',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {company.name.charAt(0)}
                </span>
                <span className="flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {company.name}
                  </span>
                  {company.code && (
                    <span className="block truncate text-xs text-muted-foreground">
                      Code: {company.code}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                )}
              </button>
            )
          })}
        </div>

        {selectCompany.isError && (
          <p className="mt-3 text-sm text-destructive">
            {selectCompany.error.message}
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={handleLogout}
            className="gap-2 text-destructive hover:bg-accent hover:text-accent-foreground"
          >
            {logout.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Log out
          </Button>
          <Button
            disabled={busy || selectedId == null}
            onClick={() => selectedId != null && selectCompany.mutate(selectedId)}
            className="gap-2"
          >
            {selectCompany.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
