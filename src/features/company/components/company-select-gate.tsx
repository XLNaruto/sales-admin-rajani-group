import { Building2, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
 * Mounted inside the authenticated shell; shares the `/me/companies` cache with
 * the topbar switcher, so it costs no extra request.
 */
export function CompanySelectGate() {
  const { data } = useCompanies()
  const selectCompany = useSelectCompany()

  if (!data?.requiresSelection) return null

  const pendingId = selectCompany.isPending ? selectCompany.variables : null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showClose={false} className="max-w-md">
        <DialogHeader>
          <div className="mb-1 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <DialogTitle>Select a company</DialogTitle>
          <DialogDescription>
            You belong to more than one company. Choose which one to work in — you
            can switch anytime from the top bar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          {data.companies.map((company) => {
            const isPending = pendingId === company.id
            return (
              <button
                key={company.id}
                type="button"
                disabled={selectCompany.isPending}
                onClick={() => selectCompany.mutate(company.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-background px-4 py-3 text-left text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Building2 className="size-4" />
                </span>
                <span className="flex-1 truncate">{company.name}</span>
                {isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Check className="size-4 shrink-0 text-muted-foreground/40" />
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
      </DialogContent>
    </Dialog>
  )
}
