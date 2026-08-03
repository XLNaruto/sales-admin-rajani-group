/**
 * The app's single Socket.IO connection.
 *
 * One socket for the whole app, not one per component: each `io()` call with a
 * new URL opens another connection, so a component that builds its own leaks one
 * on every remount. Features join *rooms* on the shared socket instead.
 *
 * Vocabulary, because three of these look interchangeable:
 * - **path** `/socket.io` — transport plumbing, passed as an option.
 * - **namespace** `/salesInchargeAdmin` — addressing, appended to the URL. The
 *   handshake checks the token was minted for this audience.
 * - **room** e.g. `journey-plan-agent:31` — a subset of sockets. You ask to
 *   join; the server decides. Never guess the name, the API returns it.
 * - **event** e.g. `journey-plan-agent` — the message name you listen on.
 *
 * Putting the namespace in `path` (or the path in the URL) is a handshake 404.
 */
import { io, type Socket } from 'socket.io-client'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth-store'

/** Namespace for this audience — one per panel, isolated by JWT audience. */
const NAMESPACE = '/salesInchargeAdmin'

/**
 * Where the realtime service lives. Deployed it is the API's own origin (the
 * load balancer routes `/socket.io/*` to the realtime container); only in local
 * dev is it a separate port.
 */
function realtimeUrl(): string {
  const base = env.VITE_APP_API_URL
  return /localhost|127\.0\.0\.1/.test(base) ? 'http://localhost:3001' : base
}

let socket: Socket | null = null

/** The shared socket for this audience. Safe to call repeatedly. */
export function getSocket(): Socket {
  if (socket) return socket

  socket = io(`${realtimeUrl()}${NAMESPACE}`, {
    path: '/socket.io',
    // A FUNCTION, not a value: Socket.IO calls it on every (re)connect, so a
    // refreshed access token is picked up automatically. Passing `{ token }`
    // freezes the token at construction and every reconnect after expiry fails.
    auth: (cb) => cb({ token: useAuthStore.getState().token }),
    transports: ['websocket', 'polling'],
    // Connected explicitly, after login — never before there is a token.
    autoConnect: false,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  })

  // "io server disconnect" means the server closed it deliberately and the
  // client will NOT retry on its own; every other reason auto-reconnects.
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') socket?.connect()
  })

  return socket
}

/**
 * Connect the shared socket if there is a session to authenticate it with.
 * Idempotent — a no-op when already connected.
 */
export function connectSocket(): Socket | null {
  if (!useAuthStore.getState().token) return null
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

/** Call on logout. The next `getSocket()` builds a fresh one with the new token. */
export function disconnectSocket(): void {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
