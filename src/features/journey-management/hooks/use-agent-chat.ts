/**
 * The plan agent's conversation: transcript, live stream and composer state.
 *
 * The order below is not incidental — get it wrong and the first tokens are lost:
 *
 *   1. connect the socket to `/salesInchargeAdmin`
 *   2. GET the conversation — **this issues the room grant**
 *   3. emit `journey-plan-agent:join` and check the ack
 *   4. render the transcript from step 2
 *   5. POST the message (202)
 *   6. consume `journey-plan-agent` frames
 *
 * Step 2 must precede 3 (joining before the GET is denied) and 3 must precede 5
 * (the room has no replay). On reconnect the whole 2→3→4 sequence repeats: the
 * GET re-issues the expired grant *and* returns the transcript, which is the only
 * way to recover a turn that finished while the socket was down.
 *
 * **The GET is per conversation, not per message, and there is no poll.** It
 * fires when the plan (so: the sales incharge or the month) changes, when the
 * panel opens, and on every reconnect — nowhere else. A turn costs zero reads:
 * the message you sent is appended locally against the id in `turn_started`, and
 * the reply is the stream's own tokens committed against the id in
 * `turn_finished`. The server transcript stays canonical; the appended pair is
 * dropped from the merge the moment the same message comes back in a GET.
 *
 * That makes the socket load-bearing: **a turn whose frames never arrive is only
 * recovered by the timeout below, or by reopening the panel.** The server's
 * handshake was a stub when this was written, and while it is, `streaming` stays
 * false and the panel says so in its footer — the reply then appears when the
 * turn times out rather than when it finishes. Fix the handshake, not this file.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { connectSocket, getSocket } from '@/lib/realtime'
import { toastApiError } from '@/lib/api-toast'
import { toasterrormsg } from '@/lib/toast'
import { fetchAgentConversation, sendAgentMessage } from '../api/agent-api'
import { agentError } from '../lib/agent-error'
import type { AgentContentBlock, AgentMessage, AgentStreamEvent, ToolActivity } from '../types'

/** Event name every agent frame arrives under, with a `type` inside. */
const AGENT_EVENT = 'journey-plan-agent'
const JOIN_EVENT = 'journey-plan-agent:join'
const LEAVE_EVENT = 'journey-plan-agent:leave'

/**
 * Longest a turn may hold the composer. Without this a dropped terminal frame
 * (or a stalled server turn) disables the composer for the rest of the session.
 */
const TURN_TIMEOUT_MS = 180_000

/**
 * Identity for a locally appended message that the server has not numbered yet.
 * Role + prose is enough: the pair is only ever compared against the tail of the
 * same conversation, and a repeat of the same sentence is consumed one-for-one.
 */
function contentKey(message: AgentMessage): string {
  const text = message.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n')
    .trim()
  return `${message.role}:${text}`
}

/**
 * Server transcript + the messages this session appended, minus the overlap.
 *
 * A local message is dropped once the server returns it — by id when the stream
 * gave us one, and otherwise by content, consuming one server message per local
 * so that the same sentence sent twice does not hide its second copy.
 */
function mergeTranscript(server: AgentMessage[], local: AgentMessage[]): AgentMessage[] {
  if (!local.length) return server

  const byId = new Map(server.map((message) => [message.id, message]))
  const spare = new Map<string, number>()
  for (const message of server) {
    const key = contentKey(message)
    spare.set(key, (spare.get(key) ?? 0) + 1)
  }

  const extra = local.filter((message) => {
    const key = contentKey(message)
    const left = spare.get(key) ?? 0
    // Consume the twin either way, so a later local can't match it a second time.
    if (byId.has(message.id) || left > 0) {
      if (left > 0) spare.set(key, left - 1)
      return false
    }
    return true
  })

  return extra.length ? [...server, ...extra] : server
}

/** Close the running row for a tool that just reported back. */
function closeTool(
  activity: ToolActivity[],
  event: { name: string; ok: boolean; summary?: string },
): ToolActivity[] {
  let closed = false
  return activity
    .slice()
    .reverse()
    .map((row) => {
      if (closed || row.kind !== 'tool' || row.name !== event.name || !row.running) return row
      closed = true
      return { ...row, running: false, ok: event.ok, summary: event.summary }
    })
    .reverse()
}

export function useAgentChat(
  planId: string | undefined,
  options: {
    /** Whether the panel is open — nothing connects or polls while it is closed. */
    active: boolean
    /** The agent re-solved: `journey_plan_id` differs from the plan on screen. */
    onPlanSuperseded?: (planId: string) => void
  },
) {
  const { active, onPlanSuperseded } = options
  const qc = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [activity, setActivity] = useState<ToolActivity[]>([])
  const [busy, setBusy] = useState(false)
  /** True once the socket is live; until then the transcript is polled. */
  const [streaming, setStreaming] = useState(false)
  /**
   * Messages this session put on screen without re-reading the transcript: the
   * one you sent, and the one the stream wrote back. Dropped from the merge as
   * soon as a GET returns them.
   */
  const [local, setLocal] = useState<AgentMessage[]>([])

  const conversation = useQuery({
    queryKey: queryKeys.journey.agent(planId ?? ''),
    queryFn: () => fetchAgentConversation(planId as string),
    enabled: Boolean(planId) && active,
    // No interval. The transcript is read when the conversation changes and on
    // reconnect; a running turn is delivered by the socket, never by polling.
    refetchInterval: false,
  })

  const conversationId = conversation.data?.conversationId
  const conversationIdRef = useRef<number | undefined>(undefined)
  conversationIdRef.current = conversationId

  const refetchRef = useRef(conversation.refetch)
  refetchRef.current = conversation.refetch

  /** Read inside `finishTurn` without making the buffer a dependency of it. */
  const streamingTextRef = useRef('')
  streamingTextRef.current = streamingText
  const activityRef = useRef<ToolActivity[]>([])
  activityRef.current = activity

  /** Ids for messages the server has not numbered yet — negative, never collide. */
  const tempId = useRef(-1)

  /** A different conversation: nothing appended for the last one still applies. */
  useEffect(() => {
    setLocal([])
    setStreamingText('')
    setActivity([])
  }, [planId])

  /**
   * Terminal for the turn: re-enable the composer and settle the live buffer.
   *
   * With an id, the stream ran to completion and its tokens *are* the assistant's
   * message — it is committed under that id and nothing is re-read. Without one
   * (no socket, or a failed turn) the persisted transcript is the only source,
   * so it is fetched.
   */
  const finishTurn = useCallback((assistantMessageId?: number) => {
    setBusy(false)

    const text = streamingTextRef.current.trim()
    if (assistantMessageId != null && text) {
      // The tool rows carry over as `tool_use` blocks: they are part of what the
      // turn did, and the transcript's own copy is no longer being read back.
      const tools: AgentContentBlock[] = activityRef.current
        .filter((row) => row.kind === 'tool' && row.name)
        .map((row) => ({ type: 'tool_use', name: row.name, input: row.input }))
      setLocal((rows) => [
        ...rows,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: [{ type: 'text', text: streamingTextRef.current }, ...tools],
          error: null,
          createdAt: null,
        },
      ])
      setActivity([])
    } else {
      void refetchRef.current()
    }

    setStreamingText('')
  }, [])

  /* 1 + 2 + 3 — connect, authorize, join. Re-runs on every reconnect. */
  useEffect(() => {
    if (!planId || !active) return
    const socket = connectSocket() ?? getSocket()

    let cancelled = false

    const join = (id: number) => {
      socket.emit(JOIN_EVENT, { conversation_id: id }, (ack?: { ok?: boolean }) => {
        // A denied join is silent unless the ack is checked. It almost always
        // means the grant expired, and the GET above is what re-issues it.
        if (!ack?.ok && !cancelled) setStreaming(false)
        else if (!cancelled) setStreaming(true)
      })
    }

    const attach = async () => {
      const result = await refetchRef.current()
      const id = result.data?.conversationId
      if (cancelled || id == null) return
      join(id)
    }

    const onConnect = () => {
      void attach()
    }
    const onDisconnect = () => setStreaming(false)
    const onError = () => setStreaming(false)

    if (socket.connected && conversationIdRef.current != null) {
      join(conversationIdRef.current)
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onError)

    return () => {
      cancelled = true
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onError)
      const id = conversationIdRef.current
      if (id != null) socket.emit(LEAVE_EVENT, { conversation_id: id })
    }
  }, [planId, active, conversationId])

  /* 6 — consume the stream. */
  useEffect(() => {
    if (!planId || !active) return
    const socket = getSocket()

    const onEvent = (event: AgentStreamEvent) => {
      switch (event.type) {
        case 'turn_started':
          setBusy(true)
          setStreamingText('')
          setActivity([])
          // Number the message we appended optimistically, so the next GET
          // recognises it by id rather than by its text.
          setLocal((rows) =>
            rows.map((row, i) =>
              i === rows.length - 1 && row.role === 'user' && row.id < 0
                ? { ...row, id: event.user_message_id }
                : row,
            ),
          )
          break
        case 'text_delta':
          // Appended in arrival order — the frames are already ordered.
          setStreamingText((text) => text + event.text)
          break
        case 'thinking_started':
          setActivity((rows) => [...rows, { kind: 'thinking', running: true }])
          break
        case 'tool_started':
          setActivity((rows) => [
            ...rows,
            { kind: 'tool', name: event.name, input: event.input, running: true },
          ])
          break
        case 'tool_finished':
          setActivity((rows) => closeTool(rows, event))
          break
        case 'plan_changed': {
          // Always refetch: the agent may have made several edits, and coverage
          // and flags are recomputed server-side. Never patch locally.
          const changedId = String(event.journey_plan_id)
          qc.invalidateQueries({ queryKey: queryKeys.journey.plan(changedId) })
          qc.invalidateQueries({ queryKey: queryKeys.journey.plans() })
          if (changedId !== planId) onPlanSuperseded?.(changedId)
          break
        }
        // Mutually exclusive and BOTH terminal — handling only one would leave
        // the composer disabled forever.
        case 'turn_finished':
          finishTurn(event.assistant_message_id)
          break
        case 'turn_failed':
          // Never toast the provider's raw failure — it can be a JSON blob with an
          // ARN in it. The transcript's error block carries the full text.
          toasterrormsg(
            agentError(event.message)?.headline ??
              'The assistant could not finish that turn.',
          )
          finishTurn()
          break
      }
    }

    // The same function reference goes to `off` — an inline arrow removes nothing,
    // and a second identical handler doubles every `text_delta`.
    socket.on(AGENT_EVENT, onEvent)
    return () => {
      socket.off(AGENT_EVENT, onEvent)
    }
  }, [planId, active, onPlanSuperseded, finishTurn, qc])

  /** What the panel renders: the transcript, plus this session's own additions. */
  const served = conversation.data?.messages
  const messages = useMemo(() => mergeTranscript(served ?? [], local), [served, local])

  /**
   * The one read a turn can still cost, and only when the socket failed us: no
   * terminal frame arrived within the timeout, so the composer is released and
   * the transcript is read once to pick up whatever the turn actually did.
   */
  useEffect(() => {
    if (!busy) return
    const timer = setTimeout(() => finishTurn(), TURN_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [busy, finishTurn])

  const send = useMutation({
    mutationFn: (message: string) => sendAgentMessage(planId as string, message),
    // `202` has no body and the stream never echoes what you typed, so the bubble
    // is put up here. `turn_started` numbers it; a GET would only tell us what we
    // already know.
    onMutate: (message: string) => {
      const id = tempId.current--
      setLocal((rows) => [
        ...rows,
        { id, role: 'user', content: [{ type: 'text', text: message }], error: null, createdAt: null },
      ])
      setBusy(true)
      setStreamingText('')
      setActivity([])
      return { id }
    },
    onError: (error, _message, context) => {
      // Never leave a bubble for a message the server did not accept.
      if (context) setLocal((rows) => rows.filter((row) => row.id !== context.id))
      setBusy(false)
      toastApiError(error, 'Failed to send the message.')
    },
  })

  return {
    conversation: conversation.data,
    isLoading: conversation.isLoading,
    error: conversation.error,
    /** The transcript, canonical. */
    messages,
    /** Tokens of the turn in flight — a live preview of the message being written. */
    streamingText,
    /** Tool + thinking rows for the turn in flight. */
    activity,
    busy,
    /** False ⇒ no live stream; the transcript is being polled instead. */
    streaming,
    /** Bedrock is configured for this environment. */
    enabled: conversation.data?.enabled ?? false,
    send: (message: string) => send.mutate(message),
  }
}
