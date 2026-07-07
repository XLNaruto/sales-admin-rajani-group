import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '../store/onboarding-store'
import { useOnboardDistributor } from '../api/use-distributors'

const STEPS = ['Identity', 'Classification', 'Contact']

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { step, data, setData, next, back, reset } = useOnboardingStore()
  const onboard = useOnboardDistributor()

  const canProceed =
    (step === 0 && data.name.trim() && data.code.trim()) ||
    (step === 1 && data.category && data.zone) ||
    step === 2

  const submit = () => {
    onboard.mutate(data, {
      onSuccess: () => {
        reset()
        navigate({ to: '/distributors' })
      },
    })
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Onboard Distributor</CardTitle>
        <ol className="mt-3 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  i < step
                    ? 'bg-success text-white'
                    : i === step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-sm',
                  i === step ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 0 && (
          <>
            <Field label="Distributor Name">
              <Input
                value={data.name}
                onChange={(e) => setData({ name: e.target.value })}
                placeholder="Shree Traders"
              />
            </Field>
            <Field label="Distributor Code">
              <Input
                value={data.code}
                onChange={(e) => setData({ code: e.target.value })}
                placeholder="DST-007"
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Category">
              <select
                value={data.category}
                onChange={(e) => setData({ category: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {['A', 'B', 'C'].map((c) => (
                  <option key={c} value={c}>
                    Category {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zone">
              <select
                value={data.zone}
                onChange={(e) => setData({ zone: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {['North', 'South', 'East', 'West'].map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="GSTIN">
              <Input
                value={data.gstin}
                onChange={(e) => setData({ gstin: e.target.value })}
                placeholder="24ABCDE1234F1Z5"
              />
            </Field>
            <Field label="Contact Number">
              <Input
                value={data.contact}
                onChange={(e) => setData({ contact: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </Field>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Review</p>
              <p className="mt-1 text-muted-foreground">
                {data.name || '—'} ({data.code || '—'}) · Cat {data.category} ·{' '}
                {data.zone}
              </p>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? navigate({ to: '/distributors' }) : back())}
          >
            <ChevronLeft /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step < 2 ? (
            <Button onClick={next} disabled={!canProceed}>
              Next <ChevronRight />
            </Button>
          ) : (
            <Button onClick={submit} disabled={onboard.isPending}>
              <Check /> {onboard.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
