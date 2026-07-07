import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { queryKeys } from '@/lib/query-keys'
import { fieldAssistService } from './field-assist-service'

/** Validates a single raw row from the Field Assist feed. */
const fieldAssistRowSchema = z.object({
  retailerId: z.string().min(1),
  outletName: z.string().min(1),
  outletCode: z.string().min(1),
  linkedDistributor: z.string().min(1),
  region: z.string().min(1),
  outletClass: z.string().min(1),
  avgMonthlySale: z.number().nonnegative(),
  active: z.boolean(),
})

export interface ImportResult {
  imported: number
  skipped: number
}

async function importFromFieldAssist(): Promise<ImportResult> {
  const rawRows = await fieldAssistService.fetchRetailers()

  let imported = 0
  let skipped = 0
  for (const row of rawRows) {
    if (fieldAssistRowSchema.safeParse(row).success) {
      imported += 1
    } else {
      skipped += 1
    }
  }

  return { imported, skipped }
}

export function useImportRetailers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: importFromFieldAssist,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.retailers.all }),
  })
}
