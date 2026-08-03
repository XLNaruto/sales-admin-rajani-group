/**
 * A failed agent turn, rendered for a sales admin.
 *
 * The failure the transcript carries is whatever the model provider said, verbatim
 * — an IAM denial can arrive as a 403 with two concatenated JSON bodies and a
 * 200-character ARN in it. None of that belongs in a chat bubble unwrapped, so this
 * splits it into a line the reviewer can act on plus the raw text, kept for whoever
 * has to fix the deployment.
 *
 * Pure and string-only: the classification is by keyword because the shape of a
 * provider error is not ours to depend on.
 */

/** A leading HTTP status, as the API prefixes its passthrough failures. */
const LEADING_STATUS = /^(\d{3})\b/

/** Every `"message": "..."` in a JSON-ish blob, escapes intact. */
const JSON_MESSAGE = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/g

/** Anything with provider plumbing in it is not a sentence for an admin. */
const TECHNICAL = /\b(arn:|aws|iam|assumed-role|sts|bedrock|policy|request_id|traceback)\b/i

export interface AgentError {
  /** One sentence, safe to show as-is. */
  headline: string
  /** The raw failure, when the headline replaced it rather than being it. */
  detail?: string
}

/** Un-escape the string body of a JSON `"message"` match. */
function unescape(value: string): string {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .trim()
}

export function agentError(raw: string | null | undefined): AgentError | null {
  const text = (raw ?? '').trim()
  if (!text) return null

  const status = Number(LEADING_STATUS.exec(text)?.[1] ?? Number.NaN)
  const lower = text.toLowerCase()

  // The innermost `message` is the specific one — providers nest a generic
  // envelope around the real complaint.
  const found = [...text.matchAll(JSON_MESSAGE)].map((match) => unescape(match[1]))
  const provider = found.length ? found[found.length - 1] : ''

  if (
    status === 401 ||
    status === 403 ||
    lower.includes('not authorized') ||
    lower.includes('accessdenied') ||
    lower.includes('permission_error')
  ) {
    return {
      headline:
        'The assistant’s AI service refused the request — its credentials are not allowed to run the model. That is a deployment setting, not something you can fix from here; send this to whoever manages the environment.',
      detail: text,
    }
  }

  if (
    status === 429 ||
    lower.includes('throttl') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit')
  ) {
    return {
      headline: 'The AI service is rate-limiting requests. Wait a moment, then ask again.',
      detail: text,
    }
  }

  if (status >= 500 || lower.includes('timed out') || lower.includes('timeout')) {
    return {
      headline: 'The assistant could not finish that turn. Try asking again.',
      detail: text,
    }
  }

  // A short, plumbing-free line is already written for a person — the API's own
  // refusals (a locked day, a workload conflict) come through here.
  const candidate = provider || text
  if (candidate.length <= 200 && !TECHNICAL.test(candidate) && !candidate.includes('{')) {
    return { headline: candidate }
  }

  return {
    headline: 'The assistant could not finish that turn.',
    detail: text,
  }
}
