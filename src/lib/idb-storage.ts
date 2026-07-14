import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'
import { decryptString, encryptString, obfuscateName } from './crypto'

interface Envelope {
  /** AES-GCM encrypted state payload. */
  value: string
  expiresAt: number | null
  /** Session-only: kept alive only while a browser tab is open (see below). */
  sessionOnly: boolean
}

const idbStore: UseStore = createStore(obfuscateName('sales-admin'), obfuscateName('persist'))

// Drop the pre-encryption database so old plaintext state doesn't linger.
if (typeof indexedDB !== 'undefined') {
  indexedDB.deleteDatabase('sales-admin')
}

/**
 * The session payload is shared across tabs via IndexedDB. A session-only login
 * must survive opening a NEW tab (e.g. a pasted URL) yet still end when the whole
 * browser is closed and reopened. `sessionStorage` alone can't do this — it's
 * per-tab — so we add a cross-tab liveness handshake over a BroadcastChannel:
 *
 *  • Each tab holding a live session-only session sets a per-tab `sessionStorage`
 *    flag and answers "alive" pings from other tabs.
 *  • A fresh tab with no flag pings the channel; if ANY open tab answers, it
 *    adopts the session. If none answers within the timeout, every tab was
 *    closed (browser restart) → the session is treated as ended.
 *
 * Remembered logins are not session-only: they skip this and live until expiry.
 */
const aliveKey = (name: string) => obfuscateName(`${name}:session-alive`)

const CHANNEL_NAME = obfuscateName('sa-session')
const PING_TIMEOUT_MS = 250

type LivenessMessage = { type: 'ping' | 'pong'; name: string }

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

// Answer liveness pings from other tabs whenever THIS tab holds the session.
channel?.addEventListener('message', (e: MessageEvent<LivenessMessage>) => {
  const msg = e.data
  if (msg?.type === 'ping' && sessionStorage.getItem(aliveKey(msg.name)) != null) {
    channel.postMessage({ type: 'pong', name: msg.name } satisfies LivenessMessage)
  }
})

/** Ask other open tabs whether a session-only session is still alive. */
function anyTabAlive(name: string): Promise<boolean> {
  if (!channel) return Promise.resolve(false)
  return new Promise((resolve) => {
    let settled = false
    const finish = (alive: boolean) => {
      if (settled) return
      settled = true
      channel.removeEventListener('message', onMessage)
      resolve(alive)
    }
    const onMessage = (e: MessageEvent<LivenessMessage>) => {
      if (e.data?.type === 'pong' && e.data.name === name) finish(true)
    }
    channel.addEventListener('message', onMessage)
    channel.postMessage({ type: 'ping', name } satisfies LivenessMessage)
    setTimeout(() => finish(false), PING_TIMEOUT_MS)
  })
}

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

      const drop = async () => {
        await del(key, idbStore)
        sessionStorage.removeItem(aliveKey(name))
        return null
      }

      if (envelope.expiresAt != null && Date.now() > envelope.expiresAt) return drop()

      // Session-only: valid if this tab already owns it, or another open tab
      // confirms the browser session is still alive. Otherwise it has ended.
      if (envelope.sessionOnly && sessionStorage.getItem(aliveKey(name)) == null) {
        if (!(await anyTabAlive(name))) return drop()
        sessionStorage.setItem(aliveKey(name), '1') // adopt into this tab
      }

      try {
        return await decryptString(envelope.value)
      } catch {
        // Corrupt or undecryptable payload (e.g. rotated secret) — discard it.
        return drop()
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
