import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react'
import { DropdownMenu, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useCompanies } from '../api/use-companies'
import { useSelectCompany } from '../api/use-select-company'

/** Shared chip styling for the topbar trigger. */
const chip =
  'flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm font-medium text-foreground'

/**
 * Active-company selector for the topbar (sits before the profile menu). Lists
 * the tenants the admin belongs to and switches the active one via
 * `POST /me/company/select`. Always renders a visible affordance while
 * authenticated — a loading chip, an error chip, or the company dropdown.
 */
export function CompanySwitcher() {
  const { data, isLoading, isError, error } = useCompanies()
  const selectCompany = useSelectCompany()

  if (isLoading) {
    return (
      <div className={cn(chip, 'text-muted-foreground')}>
        <Loader2 className="size-4 animate-spin" />
        <span className="hidden lg:block">Loading…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(chip, 'border-destructive/40 text-destructive')}
        title={error?.message}
      >
        <Building2 className="size-4" />
        <span className="hidden lg:block">Companies unavailable</span>
      </div>
    )
  }

  const companies = data?.companies ?? []
  if (companies.length === 0) return null

  const activeId = data?.selectedCompanyId ?? null
  const active = companies.find((c) => c.id === activeId)
  const label = active?.name ?? 'Select company'

  return (
    <DropdownMenu
      className="min-w-56 p-1"
      trigger={
        <button
          type="button"
          className={cn(chip, 'cursor-pointer transition-colors hover:bg-accent')}
          title="Switch company"
        >
          <Building2 className="size-4 text-muted-foreground" />
          <span className="hidden max-w-40 truncate lg:block">{label}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      }
    >
      <DropdownLabel>Companies</DropdownLabel>
      <DropdownSeparator />
      {companies.map((company) => {
        const isActive = company.id === activeId
        return (
          <button
            key={company.id}
            type="button"
            disabled={selectCompany.isPending}
            onClick={() => {
              if (!isActive) selectCompany.mutate(company.id)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60',
              isActive && 'font-semibold',
            )}
          >
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{company.name}</span>
            {isActive && <Check className="size-4 shrink-0 text-primary" />}
          </button>
        )
      })}
    </DropdownMenu>
  )
}
