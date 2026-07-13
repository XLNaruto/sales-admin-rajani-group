import { env } from '@/config/env'

/**
 * Lightweight client-side encryption for persisted storage.
 *
 * Values are encrypted with AES-GCM (Web Crypto), the key derived from an app
 * secret via PBKDF2. Names (store / record keys) are obfuscated with a
 * synchronous FNV-1a hash so nothing is human-readable in DevTools.
 *
 * Note: this is obfuscation-grade protection — the key material ships in the
 * bundle, so it deters casual inspection, not a determined attacker.
 */

const NAMESPACE = 'sales-admin'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.VITE_APP_ENCRYPT_KEY),
        'PBKDF2',
        false,
        ['deriveKey'],
      )
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode(`${NAMESPACE}:storage:v1`),
          iterations: 100_000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
    })()
  }
  return keyPromise
}

/** Encrypt a UTF-8 string to a base64 payload (12-byte IV prepended). */
export async function encryptString(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )
  const cipherBytes = new Uint8Array(cipher)
  const combined = new Uint8Array(iv.length + cipherBytes.length)
  combined.set(iv, 0)
  combined.set(cipherBytes, iv.length)
  return toBase64(combined)
}

/** Decrypt a base64 payload produced by {@link encryptString}. */
export async function decryptString(payload: string): Promise<string> {
  const key = await getKey()
  const combined = fromBase64(payload)
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return decoder.decode(plain)
}

/**
 * Deterministically obfuscate a name (store / key) with FNV-1a. Synchronous so
 * it can be used where a storage key is needed up front.
 */
export function obfuscateName(name: string): string {
  let hash = 0x811c9dc5
  const salted = `${NAMESPACE}:${name}`
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `x${(hash >>> 0).toString(16).padStart(8, '0')}`
}
