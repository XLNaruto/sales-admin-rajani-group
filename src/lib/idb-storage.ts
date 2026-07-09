import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'
import { decryptString, encryptString, obfuscateName } from './crypto'

interface Envelope {
  /** AES-GCM encrypted state payload. */
  value: string
  expiresAt: number | null
  sessionOnly: boolean
}

const idbStore: UseStore = createStore(obfuscateName('sales-admin'), obfuscateName('persist'))

// Drop the pre-encryption database so old plaintext state doesn't linger.
if (typeof indexedDB !== 'undefined') {
  indexedDB.deleteDatabase('sales-admin')
}

const aliveKey = (name: string) => obfuscateName(`${name}:session-alive`)

function readMeta(value: string): { rememberMe: boolean; expiresAt: number | null } {
  try {
    const parsed = JSON.parse(value) as {
      state?: { rememberMe?: boolean; expiresAt?: number | null }
    }
    return {
      rememberMe: parsed.state?.rememberMe ?? false,
      expiresAt: parsed.state?.expiresAt ?? null,
    }
  } catch {
    return { rememberMe: false, expiresAt: null }
  }
}

export function createIdbSessionStorage(): StateStorage {
  return {
    async getItem(name) {
      const key = obfuscateName(name)
      const envelope = await get<Envelope>(key, idbStore)
      if (!envelope) return null

      const expired = envelope.expiresAt != null && Date.now() > envelope.expiresAt
      const sessionEnded =
        envelope.sessionOnly && sessionStorage.getItem(aliveKey(name)) == null

      if (expired || sessionEnded) {
        await del(key, idbStore)
        sessionStorage.removeItem(aliveKey(name))
        return null
      }

      try {
        return await decryptString(envelope.value)
      } catch {
        // Corrupt or undecryptable payload (e.g. rotated secret) — discard it.
        await del(key, idbStore)
        sessionStorage.removeItem(aliveKey(name))
        return null
      }
    },

    async setItem(name, value) {
      const { rememberMe, expiresAt } = readMeta(value)
      const sessionOnly = !rememberMe

      if (sessionOnly) {
        sessionStorage.setItem(aliveKey(name), '1')
      } else {
        sessionStorage.removeItem(aliveKey(name))
      }

      const envelope: Envelope = {
        value: await encryptString(value),
        expiresAt,
        sessionOnly,
      }
      await set(obfuscateName(name), envelope, idbStore)
    },

    async removeItem(name) {
      await del(obfuscateName(name), idbStore)
      sessionStorage.removeItem(aliveKey(name))
    },
  }
}
