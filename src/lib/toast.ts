import { toast } from 'sonner'

/** App toast helpers. Styling comes from the global <Toaster /> (sonner). */
export function toastsuccessmsg(message: string, duration = 2000) {
  return toast.success(message, { duration })
}

export function toasterrormsg(
  message: string,
  options?: { description?: string; duration?: number },
) {
  return toast.error(message, { duration: 4500, ...options })
}
