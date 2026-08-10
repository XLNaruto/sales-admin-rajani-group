import { clear, createStore, del, get, set, type UseStore } from 'idb-keyval'
import { decryptString, encryptString, obfuscateName } from './crypto'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'

/**
 * Local, per-form draft storage backed by IndexedDB.
 *
 * A draft is an unsubmitted create form. Each form kind ("sales-incharge:create")
 * owns a bucket of drafts, so a user can park several half-filled records and
 * come back to any of them. Drafts never reach the server — they live on this
 * device until the form is submitted, then they're dropped.
 *
 * Layout, and why:
 *
 *  • One **bucket** entry per (scope, formKey) holds every draft's metadata and
 *    plain values as a single AES-GCM payload — the same obfuscation-grade
 *    protection `idb-storage.ts` gives the session, since drafts hold PII
 *    (names, mobiles, Aadhaar numbers) sitting in DevTools-readable storage.
 *  • **Files** are stored as separate structured-cloned entries, outside that
 *    payload. IndexedDB can hold a `File` natively, and keeping multi-MB photos
 *    out of the bucket means a blur-triggered save doesn't re-encrypt and
 *    rewrite them — the bucket stays a few KB. The bucket only remembers each
 *    file's fingerprint so an unchanged photo is never rewritten. A file field
 *    may hold a single `File` (sales incharge) or a `File[]` (distributor /
 *    retailer galleries); each element gets its own entry, keyed by index.
 *
 * Scope: every key is namespaced by user id + active company, so drafts can't
 * bleed between admins on a shared machine or across a tenant switch.
 */

/** Bumped when the stored shape changes — a mismatched bucket is discarded. */
const DRAFT_VERSION = 2

/** Drafts untouched for this long are pruned on the next read. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000

const draftStore: UseStore = createStore(
  obfuscateName('sales-admin-drafts'),
  obfuscateName('drafts'),
)

/** One row in the drafts list — enough to identify a draft without loading it. */
export interface DraftSummary {
  id: string
  createdAt: number
  updatedAt: number
  /** Primary line, usually the main name field ("Ramesh Yadav"). */
  label: string
  /** Secondary line — a couple of identifying fields ("9876543210 · a@b.com"). */
  summary: string
}

/** A draft with its form values (Files merged back in). */
export interface Draft<V> extends DraftSummary {
  values: Partial<V>
}

/** What one file field held, so it can be rebuilt in the same shape. */
interface StoredFileField {
  /** True when the form value was an array — restored as one, even if empty. */
  multi: boolean
  /** `name|size|lastModified` per element, positionally keyed to its entry. */
  prints: string[]
}

/** A draft as held inside the encrypted bucket — Files live outside it. */
interface StoredDraft extends DraftSummary {
  values: Record<string, unknown>
  /** field → the fingerprints of the Files kept under their own keys. */
  files: Record<string, StoredFileField>
}

interface Bucket {
  version: number
  /** AES-GCM payload; decrypts to `Record<draftId, StoredDraft>`. */
  data: string
}

type Drafts = Record<string, StoredDraft>

/**
 * Keys are namespaced by the signed-in admin and their active tenant. Read at
 * call time (not module load) because both can change within a session.
 */
function scope(): string {
  const userId = useAuthStore.getState().user?.id ?? 'anon'
  const companyId = useCompanyStore.getState().selectedCompanyId ?? 'none'
  return `${userId}:${companyId}`
}

const bucketKey = (formKey: string) => obfuscateName(`${scope()}:${formKey}`)

const fileKey = (formKey: string, id: string, field: string, index: number) =>
  obfuscateName(`${scope()}:${formKey}:${id}:${field}:${index}`)

/** Cheap identity for a picked file, so unchanged photos aren't rewritten. */
const fingerprint = (file: File) => `${file.name}|${file.size}|${file.lastModified}`

/** Files can arrive singly or as a list — normalise to a list either way. */
const toFileList = (value: unknown): File[] =>
  Array.isArray(value)
    ? value.filter((v): v is File => v instanceof File)
    : value instanceof File
      ? [value]
      : []

/** A value that must not go through JSON — it holds Files, not data. */
const holdsFile = (value: unknown): boolean =>
  value instanceof File || (Array.isArray(value) && value.some((v) => v instanceof File))

async function readBucket(formKey: string): Promise<Drafts> {
  const bucket = await get<Bucket>(bucketKey(formKey), draftStore)
  if (!bucket || bucket.version !== DRAFT_VERSION) return {}
  try {
    return JSON.parse(await decryptString(bucket.data)) as Drafts
  } catch {
    // Corrupt or undecryptable (e.g. a rotated key) — start clean.
    return {}
  }
}

async function writeBucket(formKey: string, drafts: Drafts): Promise<void> {
  const bucket: Bucket = {
    version: DRAFT_VERSION,
    data: await encryptString(JSON.stringify(drafts)),
  }
  await set(bucketKey(formKey), bucket, draftStore)
}

/** Delete the file entries a draft owns. */
async function dropFiles(formKey: string, draft: StoredDraft): Promise<void> {
  for (const [field, stored] of Object.entries(draft.files)) {
    for (let i = 0; i < stored.prints.length; i++) {
      await del(fileKey(formKey, draft.id, field, i), draftStore)
    }
  }
}

/** Drop expired drafts, persisting the result only when something was removed. */
async function prune(formKey: string, drafts: Drafts): Promise<Drafts> {
  const cutoff = Date.now() - TTL_MS
  const expired = Object.values(drafts).filter((d) => d.updatedAt < cutoff)
  if (expired.length === 0) return drafts

  for (const draft of expired) {
    await dropFiles(formKey, draft)
    delete drafts[draft.id]
  }
  await writeBucket(formKey, drafts)
  return drafts
}

/** Every live draft for a form, newest first. */
export async function listDrafts(formKey: string): Promise<DraftSummary[]> {
  const drafts = await prune(formKey, await readBucket(formKey))
  return Object.values(drafts)
    .map(({ id, createdAt, updatedAt, label, summary }) => ({
      id,
      createdAt,
      updatedAt,
      label,
      summary,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/** One draft with its Files merged back into the values. */
export async function loadDraft<V>(formKey: string, id: string): Promise<Draft<V> | null> {
  const drafts = await prune(formKey, await readBucket(formKey))
  const draft = drafts[id]
  if (!draft) return null

  const values: Record<string, unknown> = { ...draft.values }
  for (const [field, stored] of Object.entries(draft.files)) {
    const files: File[] = []
    for (let i = 0; i < stored.prints.length; i++) {
      const file = await get<File>(fileKey(formKey, id, field, i), draftStore)
      if (file) files.push(file)
    }
    // A list field is restored as a list even when every entry went missing —
    // its control expects an array, not `undefined`.
    if (stored.multi) values[field] = files
    else if (files[0]) values[field] = files[0]
  }

  const { createdAt, updatedAt, label, summary } = draft
  return { id, createdAt, updatedAt, label, summary, values: values as Partial<V> }
}

export interface SaveDraftInput<V> {
  formKey: string
  /** Existing draft to overwrite; omit to start a new one. */
  id?: string
  values: Partial<V>
  /** Keys of `values` holding a `File` — stored outside the encrypted payload. */
  fileFields?: string[]
  label: string
  summary: string
}

/** Create or overwrite a draft. Returns its id (generated on first save). */
export async function saveDraft<V>(input: SaveDraftInput<V>): Promise<string> {
  const { formKey, values, fileFields = [], label, summary } = input
  const drafts = await readBucket(formKey)
  const id = input.id ?? crypto.randomUUID()
  const now = Date.now()
  const previous = drafts[id]

  // Files are split out and written separately (see the header comment); a
  // stray File anywhere else is dropped rather than sent through JSON.
  const plain: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    if (!fileFields.includes(key) && !holdsFile(value)) plain[key] = value
  }

  const files: Record<string, StoredFileField> = {}
  for (const field of fileFields) {
    const value = (values as Record<string, unknown>)[field]
    const picked = toFileList(value)
    const before = previous?.files[field]?.prints ?? []
    const prints = picked.map(fingerprint)

    for (let i = 0; i < picked.length; i++) {
      // Only touch IndexedDB when the file at this slot actually changed.
      if (before[i] !== prints[i]) await set(fileKey(formKey, id, field, i), picked[i], draftStore)
    }
    // The list got shorter (or was cleared) — drop the orphaned tail entries.
    for (let i = picked.length; i < before.length; i++) {
      await del(fileKey(formKey, id, field, i), draftStore)
    }

    const multi = Array.isArray(value)
    if (picked.length > 0 || multi) files[field] = { multi, prints }
  }

  drafts[id] = {
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    label,
    summary,
    values: plain,
    files,
  }
  await writeBucket(formKey, drafts)
  return id
}

/** Delete one draft and the files it owns. */
export async function removeDraft(formKey: string, id: string): Promise<void> {
  const drafts = await readBucket(formKey)
  const draft = drafts[id]
  if (!draft) return
  await dropFiles(formKey, draft)
  delete drafts[id]
  await writeBucket(formKey, drafts)
}

/** Delete every draft of one form kind, files included. */
export async function clearFormDrafts(formKey: string): Promise<void> {
  const drafts = await readBucket(formKey)
  for (const draft of Object.values(drafts)) await dropFiles(formKey, draft)
  await writeBucket(formKey, {})
}

/** Wipe every draft on this device — called on sign-out. */
export async function clearAllDrafts(): Promise<void> {
  await clear(draftStore)
}
