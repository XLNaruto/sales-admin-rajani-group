/**
 * Shared `validateSearch` for every screen that carries its params in a single
 * encrypted `?data=` token (see `encryptParams` / `decryptParams` in
 * `lib/crypto.ts`). Keeps raw ids out of the address bar: an edit screen is
 * `/distributors/create?data=CEMFAVEXWBk`, never `/distributors/1/edit`.
 */
export type DataSearch = { data?: string }

export function validateDataSearch(search: Record<string, unknown>): DataSearch {
  return { data: typeof search.data === 'string' ? search.data : undefined }
}
