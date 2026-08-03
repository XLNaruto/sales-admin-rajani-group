/**
 * The plan agent's REST surface — two calls.
 *
 * `GET` is not just a read: it is what **authorizes** the socket room join (the
 * API records a short-lived grant in Redis keyed by room and subject), so it must
 * precede the join and be repeated on every reconnect. `POST` answers `202`
 * accepted-and-running; the reply arrives over the socket, not here.
 */
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { asApiError } from '@/lib/api-error'
import { agentConversationSchema } from '../schemas'
import { monthOf } from '../lib/journey-format'
import type { AgentContentBlock, AgentConversation, AgentMessage } from '../types'

/** Anthropic content blocks, passed through unflattened; a bare string wraps. */
function toBlocks(content: unknown): AgentContentBlock[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (Array.isArray(content)) return content as AgentContentBlock[]
  return []
}

/** GET /journey-plans/{id}/agent — the transcript, and the room grant. */
export async function fetchAgentConversation(planId: string): Promise<AgentConversation> {
  try {
    const raw = await http.get<unknown>(endpoints.JOURNEY_PLAN.AGENT(planId))
    const res = agentConversationSchema.parse(raw)
    const messages: AgentMessage[] = (res.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role as AgentMessage['role'],
      content: toBlocks(message.content),
      error: message.error ?? null,
      createdAt: message.created_at ?? null,
    }))
    return {
      conversationId: res.conversation_id,
      journeyPlanId: res.journey_plan_id,
      periodMonth: monthOf(res.period_month),
      inchargeId: res.sales_incharge_id ?? '',
      room: res.room,
      event: res.event,
      // `false` ⇒ Bedrock is off in this environment: disable the composer up
      // front rather than failing on send.
      enabled: res.enabled ?? false,
      messages,
    }
  } catch (error) {
    throw asApiError(error, 'Failed to open the assistant.')
  }
}

/** POST /journey-plans/{id}/agent/messages — 202, the turn runs server-side. */
export async function sendAgentMessage(planId: string, message: string): Promise<void> {
  try {
    await http.post<unknown>(endpoints.JOURNEY_PLAN.AGENT_MESSAGES(planId), { message })
  } catch (error) {
    throw asApiError(error, 'Failed to send the message.')
  }
}
