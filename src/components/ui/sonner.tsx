import { Toaster as SonnerToaster } from 'sonner'
import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from 'lucide-react'
import { useUiStore } from '@/stores/ui-store'

/**
 * App-wide toast host.
 *
 * A react-hot-toast–inspired look, redesigned as our own: a compact rounded
 * card with a soft layered shadow, a colored icon badge, and a springy pop-in.
 * Follows the current theme.
 */
export function Toaster() {
  const theme = useUiStore((s) => s.theme)

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      gap={10}
      offset={20}
      icons={{
        success: <IconBadge tone="success"><CheckCircle2 className="size-4" /></IconBadge>,
        error: <IconBadge tone="error"><XCircle className="size-4" /></IconBadge>,
        warning: <IconBadge tone="warning"><TriangleAlert className="size-4" /></IconBadge>,
        info: <IconBadge tone="info"><Info className="size-4" /></IconBadge>,
        loading: <IconBadge tone="info"><Loader2 className="size-4 animate-spin" /></IconBadge>,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'toast-pop group pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white/95 px-4 py-3 shadow-[0_10px_30px_-8px_rgba(15,23,42,0.28),0_2px_8px_-4px_rgba(15,23,42,0.16)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]',
          icon: 'shrink-0',
          content: 'flex flex-col gap-0.5',
          title: 'font-sans text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50',
          description: 'font-sans text-xs leading-snug text-slate-500 dark:text-slate-400',
          actionButton:
            'ml-auto rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900',
        },
      }}
    />
  )
}

type Tone = 'success' | 'error' | 'warning' | 'info'

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400',
  error: 'bg-rose-500/15 text-rose-600 ring-rose-500/25 dark:text-rose-400',
  warning: 'bg-amber-500/15 text-amber-600 ring-amber-500/25 dark:text-amber-400',
  info: 'bg-sky-500/15 text-sky-600 ring-sky-500/25 dark:text-sky-400',
}

function IconBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`icon-pop grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}
