import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'

/** Shape of `GET /sales-incharge-admin/config` — client-safe settings only. */
const configResponseSchema = z.object({
  media_base_url: z.string(),
})

export interface AppConfig {
  /** Origin used to build media/asset URLs from API-returned paths. */
  mediaBaseUrl: string
}

/** GET /sales-incharge-admin/config — client-facing application config. */
export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const raw = await http.get<unknown>(endpoints.CONFIG.GET)
    const { media_base_url } = configResponseSchema.parse(raw)
    return { mediaBaseUrl: media_base_url }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load application config.'))
  }
}
