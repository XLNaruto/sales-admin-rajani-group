import { z } from 'zod'

/** All environment access flows through here (zod-parsed). */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000/api'),
  VITE_USE_MOCK_API: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  VITE_MAP_TILE_URL: z
    .string()
    .default('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
})

export const env = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API,
  VITE_MAP_TILE_URL: import.meta.env.VITE_MAP_TILE_URL,
})
