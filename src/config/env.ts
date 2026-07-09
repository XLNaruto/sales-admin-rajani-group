import { z } from 'zod'

/** All environment access flows through here (zod-parsed, fail-fast). */
const envSchema = z.object({
  // API origin (e.g. http://192.168.1.20:3000); endpoint paths are appended.
  // Empty string (unset in some .env files) falls back to the default.
  VITE_APP_API_URL: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v || 'http://localhost:3000'),
  VITE_USE_MOCK_API: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  VITE_MAP_TILE_URL: z
    .string()
    .default('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),

  /** Secret used to derive the key that encrypts persisted client storage. */
  VITE_APP_ENCRYPT_KEY: z.string().default('sales-admin-storage-key'),

  // --- Firebase (Phone Auth + Cloud Messaging) -----------------------------
  // Public web-app config (ships in the client bundle), so defaults are safe.
  // Override per environment via VITE_FIREBASE_* vars.
  VITE_FIREBASE_API_KEY: z
    .string()
    .default('AIzaSyA8G5sKfglvmOlzXMMiSyNVlPRCEHo_5ZQ'),
  VITE_FIREBASE_AUTH_DOMAIN: z
    .string()
    .default('rajani-group-dms.firebaseapp.com'),
  VITE_FIREBASE_PROJECT_ID: z.string().default('rajani-group-dms'),
  VITE_FIREBASE_STORAGE_BUCKET: z
    .string()
    .default('rajani-group-dms.firebasestorage.app'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default('574730718010'),
  VITE_FIREBASE_APP_ID: z
    .string()
    .default('1:574730718010:web:4492cb954eef84754d9e03'),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().default('G-6ENTGR50ST'),
  /** Web Push certificate (VAPID) key — for FCM `getToken`. */
  VITE_FIREBASE_VAPID_KEY: z
    .string()
    .default(
      'BOsMmNvj3Qi7ZFjiYYlmUd2QBSZ6Pu3mFPL8YN9UpJsztCzoFM66ZnP-xspjKc1gzaPVi4e1NxSyN8Xga6E6cCk',
    ),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.flattenError(parsed.error).fieldErrors,
  )
  throw new Error('Invalid environment variables')
}

export const env = parsed.data

/** True once the minimum Firebase web config is present (Auth + Messaging). */
export const isFirebaseConfigured =
  Boolean(env.VITE_FIREBASE_API_KEY) &&
  Boolean(env.VITE_FIREBASE_AUTH_DOMAIN) &&
  Boolean(env.VITE_FIREBASE_PROJECT_ID) &&
  Boolean(env.VITE_FIREBASE_APP_ID)
