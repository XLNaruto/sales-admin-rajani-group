import { z } from 'zod'

/** Shape of the Firebase web-app config carried in VITE_FIREBASE_CONFIG. */
const firebaseConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  storageBucket: z.string().optional(),
  messagingSenderId: z.string().optional(),
  appId: z.string(),
  measurementId: z.string().optional(),
})

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

  /** Account type this portal authenticates as (account-check + login). */
  VITE_APP_USER_TYPE: z.string().default('salesInchargeAdmin'),

  // --- Firebase (Phone Auth + Cloud Messaging) -----------------------------
  // Public web-app config (ships in the client bundle), so defaults are safe.
  // Supplied as a single JSON object via VITE_FIREBASE_CONFIG; override per
  // environment. The VAPID key is a separate var (not part of the app config).
  VITE_FIREBASE_CONFIG: z
    .string()
    .default(
      '{"apiKey":"AIzaSyA8G5sKfglvmOlzXMMiSyNVlPRCEHo_5ZQ","authDomain":"rajani-group-dms.firebaseapp.com","projectId":"rajani-group-dms","storageBucket":"rajani-group-dms.firebasestorage.app","messagingSenderId":"574730718010","appId":"1:574730718010:web:4492cb954eef84754d9e03","measurementId":"G-6ENTGR50ST"}',
    )
    .transform((v, ctx) => {
      try {
        return firebaseConfigSchema.parse(JSON.parse(v))
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid VITE_FIREBASE_CONFIG JSON' })
        return z.NEVER
      }
    }),
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
  Boolean(env.VITE_FIREBASE_CONFIG.apiKey) &&
  Boolean(env.VITE_FIREBASE_CONFIG.authDomain) &&
  Boolean(env.VITE_FIREBASE_CONFIG.projectId) &&
  Boolean(env.VITE_FIREBASE_CONFIG.appId)
