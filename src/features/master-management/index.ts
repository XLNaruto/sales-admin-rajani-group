/**
 * Master Management — the reference masters, one self-contained sub-module per
 * sidebar menu (each with its own `api/`, `components/`, `hooks/`, `lib/`,
 * `pages/`, `types/`). This barrel is the feature's public surface: the rest of
 * the app imports from `@/features/master-management`, never a sub-module path.
 */
export * from './outlet-types'
export * from './payment-conditions'
export * from './routes'
