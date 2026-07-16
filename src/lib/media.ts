import { useConfigStore } from '@/stores/config-store'

/**
 * Build a full media URL from a storage path returned by the API.
 *
 * The backend hands back only relative paths/keys for images and documents; the
 * origin lives in the `media_base_url` config value fetched once at app start
 * (see `useAppConfig`). This joins the two.
 *
 * - Empty/nullish paths → `''` (nothing to render).
 * - Already-absolute inputs (`http(s)://`, protocol-relative, `data:`/`blob:`)
 *   are returned untouched, so object-URL previews pass through safely.
 * - When the base URL hasn't loaded yet, the raw path is returned as a fallback.
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path
  const base = useConfigStore.getState().mediaBaseUrl
  if (!base) return path
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}
