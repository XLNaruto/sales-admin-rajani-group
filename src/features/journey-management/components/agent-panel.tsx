import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  User,
  WifiOff,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { agentError } from '../lib/agent-error'
import { useAgentChat } from '../hooks/use-agent-chat'
import type { AgentContentBlock, AgentMessage, ToolActivity } from '../types'

/** Openers the reviewer can send with one tap instead of typing. */
const QUICK_PROMPTS = [
  'Which beats are short of their cycle, and why?',
  'Balance the load across the working days.',
  'Move the beats off the non-working days.',
  'Explain the flagged days.',
]

/** Read-only access: only the questions the assistant can actually answer. */
const READ_ONLY_PROMPTS = [
  'Which beats are short of their cycle, and why?',
  'Explain the flagged days.',
  'Where is the travel load heaviest?',
]

/** Longest single message. Enforced on the textarea and again on send. */
const MAX_CHARS = 1000

/** Counter appears once the reviewer is this close to the cap. */
const COUNTER_AT = 800

/** Avatar beside a bubble — the assistant, or the reviewer. */
function Speaker({ assistant }: { assistant: boolean }) {
  return (
    <span
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full',
        assistant ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {assistant ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
    </span>
  )
}

/** Prose from a message's content blocks — `text` blocks only, in order. */
function proseOf(blocks: AgentContentBlock[]): string {
  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n\n')
    .trim()
}

/** `tool_use` blocks — rendered as activity rows, not as chat. */
function toolsOf(blocks: AgentContentBlock[]): AgentContentBlock[] {
  return blocks.filter((block) => block.type === 'tool_use')
}

function Bubble({
  assistant,
  children,
}: {
  assistant: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('bubble-in flex items-end gap-2', !assistant && 'flex-row-reverse')}>
      <Speaker assistant={assistant} />
      <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-1', !assistant && 'items-end')}>
        <div
          className={cn(
            // `wrap-anywhere` (not just break-words) so an unbroken run of
            // characters wraps inside the bubble instead of stretching it.
            'max-w-full whitespace-pre-wrap wrap-anywhere rounded-2xl px-3 py-2 text-sm leading-relaxed',
            assistant
              ? 'rounded-bl-sm border border-border/60 bg-muted/50 text-foreground'
              : 'rounded-br-sm bg-primary text-primary-foreground',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** One tool call or thinking step, as a compact activity row. */
function ActivityRow({ row }: { row: ToolActivity }) {
  const label =
    row.kind === 'thinking' ? 'Thinking…' : (row.name ?? 'tool').replace(/_/g, ' ')
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[11px]">
      <span className="mt-0.5 shrink-0">
        {row.running ? (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        ) : row.ok === false ? (
          <X className="size-3 text-destructive" />
        ) : (
          <Check className="size-3 text-success" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        {/* `ok: false` is a refusal — a locked day, a workload conflict — and the
            summary is the message written for the admin. */}
        {row.summary ? (
          <span
            className={cn(
              'block wrap-anywhere',
              row.ok === false ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {row.summary}
          </span>
        ) : null}
      </span>
    </div>
  )
}

/**
 * A failed turn. The provider's text can be a multi-hundred-character JSON blob
 * with an ARN in it, so the readable line is shown and the raw failure is folded
 * away — behind a `<details>`, capped in height, and wrapped mid-token so nothing
 * can push the panel sideways.
 */
function TurnError({ raw, avatar = false }: { raw: string; avatar?: boolean }) {
  const error = agentError(raw)
  if (!error) return null

  const box = (
    <div className="min-w-0 flex-1 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
      <p className="wrap-anywhere">{error.headline}</p>
      {error.detail ? (
        <details className="mt-1">
          <summary className="cursor-pointer select-none font-medium underline-offset-2 hover:underline">
            Technical detail
          </summary>
          {/* Selectable rather than pretty: this is what gets pasted to whoever
              owns the deployment. */}
          <pre className="mt-1 max-h-32 select-text overflow-auto whitespace-pre-wrap wrap-anywhere rounded-md bg-destructive/10 p-2 font-mono text-[10px] leading-snug">
            {error.detail}
          </pre>
        </details>
      ) : null}
    </div>
  )

  // A turn that failed before saying anything has no bubble to sit under, so the
  // error carries the assistant's avatar itself — otherwise it reads as belonging
  // to nobody. Alongside prose it stays indented under the bubble above.
  if (!avatar) return <div className="ml-9 flex">{box}</div>

  return (
    <div className="flex items-start gap-2">
      <Speaker assistant />
      {box}
    </div>
  )
}

/** A transcript turn. `tool_result` messages are raw model payloads — never chat. */
function TranscriptMessage({ message }: { message: AgentMessage }) {
  if (message.role === 'tool_result') return null

  const prose = proseOf(message.content)
  const tools = toolsOf(message.content)
  const assistant = message.role === 'assistant'

  return (
    <div className="space-y-2">
      {prose ? <Bubble assistant={assistant}>{prose}</Bubble> : null}
      {tools.length ? (
        <div className="ml-9 space-y-1">
          {tools.map((tool, i) => (
            <ActivityRow
              key={`${tool.name ?? 'tool'}-${i}`}
              row={{ kind: 'tool', name: tool.name, running: false, ok: true }}
            />
          ))}
        </div>
      ) : null}
      {message.error ? (
        <TurnError raw={message.error} avatar={!prose && tools.length === 0} />
      ) : null}
    </div>
  )
}

interface AgentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Plan under discussion — one conversation per (incharge, period). */
  planId: string | undefined
  inchargeName: string
  monthLabel: string
  /**
   * The caller lacks `journey-plan:update`. Every agent write goes through the same
   * command the REST route uses, with the same actor — so the assistant is
   * read-only for them, and saying so up front beats a refusal per request.
   */
  readOnly?: boolean
  /** The agent re-solved and superseded the plan: move to the new id. */
  onPlanSuperseded?: (planId: string) => void
}

/**
 * Journey Plan → "Ask for a change": a conversation with the planning agent.
 *
 * The agent **writes directly** to the plan, with the same permissions, locks and
 * refusals as a human admin — an admin without `journey-plan:update` gets a
 * read-only assistant, and a locked day refuses it exactly as it refuses a person.
 * There is no approve tool: approval stays a human action, and the plan stays a
 * draft until someone hits Approve.
 *
 * The opening greeting and the suggestion chips are client-side copy; a new
 * conversation starts empty and there is no endpoint for either.
 */
export function AgentPanel({
  open,
  onOpenChange,
  planId,
  inchargeName,
  monthLabel,
  readOnly = false,
  onPlanSuperseded,
}: AgentPanelProps) {
  const chat = useAgentChat(planId, { active: open, onPlanSuperseded })
  const [draft, setDraft] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Pin the thread to the newest message, including while tokens arrive.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.streamingText, chat.activity])

  // Auto-grow the composer up to a few lines, then let it scroll.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  useEffect(() => {
    if (open) setDraft('')
  }, [open])

  const composerDisabled = chat.busy || !chat.enabled || !planId
  const visible = chat.messages.filter((message) => message.role !== 'tool_result')

  function send(text: string) {
    // Trim first, then cap — a paste over the limit still sends, shortened, rather
    // than being silently dropped.
    const message = text.trim().slice(0, MAX_CHARS)
    if (!message || composerDisabled) return
    setDraft('')
    chat.send(message)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle>Ask for a change</SheetTitle>
              <SheetDescription className="truncate">
                {inchargeName} · {monthLabel}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody ref={scrollRef} className="space-y-4">
          {/* Client-side opener: a new conversation genuinely starts empty. */}
          <Bubble assistant>
            {readOnly
              ? `I have ${inchargeName}'s ${monthLabel} plan open. You have read-only access, so I can explain the month and the flags on it, but I can't change anything.`
              : `I have ${inchargeName}'s ${monthLabel} plan open. Tell me what needs to change and I'll edit it — locked days and anything you can't change yourself are off limits to me too.`}
          </Bubble>

          {chat.isLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Opening the conversation…
            </p>
          ) : null}

          {visible.map((message) => (
            <TranscriptMessage key={message.id} message={message} />
          ))}

          {/* The turn in flight: tool rows, then the tokens as they arrive. */}
          {chat.activity.length ? (
            <div className="ml-9 space-y-1">
              {chat.activity.map((row, i) => (
                <ActivityRow key={`${row.kind}-${row.name ?? i}`} row={row} />
              ))}
            </div>
          ) : null}

          {chat.streamingText ? <Bubble assistant>{chat.streamingText}</Bubble> : null}

          {chat.busy && !chat.streamingText && !chat.activity.length ? (
            <p className="ml-9 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Working on it…
            </p>
          ) : null}
        </SheetBody>

        <SheetFooter className="space-y-3">
          {!chat.enabled && !chat.isLoading ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning">
              The assistant is switched off in this environment, so the composer is
              disabled. Everything it can do is available by hand on the day table.
            </p>
          ) : null}

          {chat.enabled && !chat.streaming ? (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <WifiOff className="mt-0.5 size-3 shrink-0" />
              Not connected to the live channel. Your message is still sent and the
              assistant still works on it, but the reply will not appear here until
              the connection is back — reopen this panel to read it.
            </p>
          ) : null}

          {/* Openers, only while the reviewer hasn't said anything yet. */}
          {visible.length === 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(readOnly ? READ_ONLY_PROMPTS : QUICK_PROMPTS).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={composerDisabled}
                  onClick={() => send(prompt)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="size-3" />
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-2 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={inputRef}
              autoFocus
              rows={1}
              value={draft}
              maxLength={MAX_CHARS}
              disabled={composerDisabled}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
              placeholder={
                chat.enabled ? 'What needs to change, and why?' : 'Assistant unavailable'
              }
              className="max-h-40 min-h-9 w-full resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <Button
              size="icon"
              aria-label="Send"
              disabled={draft.trim().length === 0 || composerDisabled}
              onClick={() => send(draft)}
              className="size-9 shrink-0 rounded-lg"
            >
              {chat.busy ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>

          {draft.length >= COUNTER_AT ? (
            <span
              className={cn(
                'block text-[11px] tabular-nums text-muted-foreground',
                draft.length >= MAX_CHARS && 'font-medium text-destructive',
              )}
            >
              {draft.length}/{MAX_CHARS}
            </span>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
