import { z } from 'zod'
import { http } from './http'
import { asApiError } from './api-error'

/**
 * Shared presigned-upload flow.
 *
 * Every file-bearing resource follows the same three steps: POST the batch to
 * the resource's `…/presign` endpoint → PUT the raw bytes to each returned
 * `upload_url` → persist the returned storage `key`s on the record. Only the
 * endpoint path differs, so the mechanics live here rather than in each
 * feature's `api/` layer.
 */

export const presignItemSchema = z.object({
  filename: z.string(),
  key: z.string(),
  upload_url: z.string().url(),
  // Echoed back by endpoints that accept several document categories in one
  // call, so each key can be routed to the right `*_photo_path` field.
  // Optional — single-category endpoints don't send it.
  doc_type: z.string().nullish(),
})

export const presignResponseSchema = z.object({
  items: z.array(presignItemSchema),
})

export type PresignItem = z.infer<typeof presignItemSchema>
export type PresignResponse = z.infer<typeof presignResponseSchema>

/**
 * PUT the raw file to its presigned URL. Uses bare `fetch` so the app's axios
 * interceptors (Authorization header, baseURL) don't touch the storage URL.
 */
export async function putToStorage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed for ${file.name} (${res.status})`)
}

/**
 * Presign + upload a batch of files for one category, returning the storage
 * `key`s in the same order as the input files. Empty input short-circuits.
 */
export async function uploadFiles(
  presignEndpoint: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return []
  try {
    const raw = await http.post<unknown>(presignEndpoint, {
      files: files.map((f) => ({
        filename: f.name,
        content_type: f.type || 'application/octet-stream',
      })),
    })
    const { items } = presignResponseSchema.parse(raw)
    // Match each presigned slot back to its file by filename, preserving order.
    const keys: string[] = []
    for (const file of files) {
      const slot = items.find((i) => i.filename === file.name)
      if (!slot) throw new Error(`No upload URL returned for ${file.name}`)
      await putToStorage(slot.upload_url, file)
      keys.push(slot.key)
    }
    return keys
  } catch (error) {
    throw asApiError(error, 'Failed to upload files.')
  }
}
