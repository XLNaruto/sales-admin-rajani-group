# Frontend integration map — Journey Management (Sales Incharge Admin panel)

Everything needed to wire the panel's five journey screens to the API. Written
for an agent working in the **frontend** repo who cannot read the backend
source.

**The live contract is Swagger, not this file.** Every endpoint below is
documented with full request/response schemas at:

```
<api-base>/sales-incharge-admin/docs
```

That doc is generated from the same Zod schemas the server validates with, so it
cannot drift. Use this file for *what connects to what and why*; use Swagger for
exact field lists when you need to check one.

---

## 1. Setup

| | | |
|---|---|---|
| API base | deployed | `https://api.rajanigroup.in` (prod) · `https://api.dev.rajanigroup.in` (dev) |
| | local | `http://localhost:3000` (`API_PORT`) |
| Audience prefix | | **`/sales-incharge-admin`** — prepend to every path in this doc |
| Swagger | | `<api-base>/sales-incharge-admin/docs` |

### Realtime (Socket.IO)

| | |
|---|---|
| Socket URL, deployed | **the same origin as the API** — the load balancer routes `/socket.io/*` to the realtime container |
| Socket URL, local | `http://localhost:3001` — only in local dev is it a separate port |
| Namespace | `/salesInchargeAdmin` |
| Transport path | `/socket.io` |

Only one feature uses the socket: the journey-plan agent (§3.5). **§4 is a
complete, from-scratch walkthrough** — read it before writing any socket code.

There are eight audiences (five admin panels, three mobile apps), each with its
own prefix and its own JWT. **A token minted for one audience is rejected by
every other** — that isolation is deliberate, so do not build a shared client
that swaps prefixes with one token.

### Auth flow

Login is **client-side Firebase Phone Auth → our JWT**. The backend never sends
an OTP; it verifies the Firebase ID token you obtained and issues its own pair.

```
POST /sales-incharge-admin/auth/account-check
  { phone: string, user_type: "salesInchargeAdmin" }
  → { account_exists: boolean }        // check before firing an OTP

  ── run Firebase phone auth in the browser, get an ID token ──

POST /sales-incharge-admin/auth/login
  { id_token: string, user_type: "salesInchargeAdmin" }
  → { access_token, refresh_token, expires_in }

POST /sales-incharge-admin/auth/refresh   { refresh_token }  → new pair
POST /sales-incharge-admin/auth/logout    { refresh_token }  → { success: true }
```

These four are the only unauthenticated routes. Everything else needs:

```
Authorization: Bearer <access_token>
```

**Single-login is enforced.** Logging in elsewhere invalidates older tokens; you
get `401` with `error: "SESSION_EXPIRED"`. Treat that as *log out and redirect*,
**not** as "try refreshing" — the refresh will fail too. `TOKEN_MISSING` and
`UNAUTHORIZED` are the ordinary "refresh once, then log out" cases.

### Company (tenant) selection

```
GET  /me                     → the current admin
GET  /me/companies           → companies they belong to + which is selected
POST /me/company/select      { company_id }  → refreshed list
```

The selection is **stored server-side** on the admin's row and resolved per
request. There is **no company header** — do not invent one. An admin belonging
to exactly one company is scoped automatically with no selection step; only
multi-company admins need the switcher (the "Rajani Spices" dropdown in the
header).

Every list and read below is already scoped to the selected company. If a
request 403s with `COMPANY_NOT_SELECTED`, send the user through the switcher.

---

## 2. Conventions that apply to every endpoint

**snake_case on the wire**, everywhere, including response bodies. Field names
match the database. Do not camelCase at the boundary — map inside your own
layer if your components want camelCase.

**Pagination** is page-based and uniform:

```
?page=1&page_size=20          // page_size max 100, default 20

{ "<resource_name>": [...], "total": 60, "page": 1, "page_size": 10, "total_pages": 6 }
```

The array key is the **snake_case plural resource noun** — `journey_plans`,
`activities`, `sales_incharges` — never a generic `items`. There is no
`limit`/`offset` at the HTTP surface.

**Errors** always have this shape, at every status:

```json
{ "error": "JOURNEY_PLAN_NOT_FOUND", "message": "Journey plan not found.", "details": {} }
```

`error` is a stable machine code — branch on it. `message` is human-readable and
safe to show. Statuses: `400` validation, `401` auth, `403` permission or tenant
scope, `404` missing, `409` conflict (a locked day, an approved plan), `500`
unexpected.

The codes this feature can return:

| Code | Status | Means |
|---|---|---|
| `TOKEN_MISSING`, `UNAUTHORIZED` | 401 | refresh once, then log out |
| `SESSION_EXPIRED` | 401 | a newer login replaced this session — **log out, do not refresh** |
| `COMPANY_NOT_SELECTED` | 403 | send the user through the company switcher |
| `FORBIDDEN` | 403 | missing permission — hide or disable the control |
| `JOURNEY_PLAN_NOT_FOUND`, `JOURNEY_PLAN_DAY_NOT_FOUND`, `JOURNEY_PLAN_DAY_BEAT_NOT_FOUND` | 404 | |
| `ACTIVITY_NOT_FOUND`, `BEAT_NOT_FOUND`, `VISIT_NOT_FOUND`, `VISIT_PARTY_NOT_FOUND` | 404 | |
| `JOURNEY_PLAN_DAY_LOCKED` | 409 | the day has started — it is history |
| `JOURNEY_PLAN_NOT_EDITABLE`, `JOURNEY_PLAN_ALREADY_APPROVED` | 409 | |
| `JOURNEY_PLAN_SUPERSEDED` | 409 | a re-solve replaced this plan — reload with the new id |
| `JOURNEY_PLAN_DAY_WORKLOAD_CONFLICT` | 409 | e.g. a second full-day beat on one day |
| `JOURNEY_PLAN_DAY_BEAT_DUPLICATE`, `_ASSIGNED`, `_LIMIT` | 409 | |
| `VISIT_ALREADY_RECORDED`, `VISIT_ALREADY_CHECKED_OUT` | 409 | |

The `409`s are the interesting ones: they are the plan's invariants refusing an
edit, and every one has a `message` written to be shown to the admin verbatim.

**Dates** are `YYYY-MM-DD` strings, never timestamps, wherever a calendar date
is meant (`plan_date`, `from_date`, `visit_date`). Periods are `YYYY-MM`.
Timestamps are ISO-8601 UTC. **Never construct a `Date` from a `YYYY-MM-DD`
string and read local parts back out** — the app is IST-only and that round trip
shifts the day.

**Coordinates and money are strings**, not numbers (`"22.300000"`). They are
`numeric` columns; parsing them to float loses precision. Pass them through to
the map library as-is where you can.

**REST semantics** are strict: `POST` creates only and never upserts, `PATCH`
updates and 404s when missing, `DELETE` returns `200 { success: true }` (not
`204`). A `202` means accepted-and-running, not done — currently only the agent.

---

## 3. Screen → API map

### 3.1 Approval Queue

One call drives the whole page.

```
GET /journey-plans?period_month=2026-07&page=1&page_size=10
```

| Query param | |
|---|---|
| `period_month` | **required**, `YYYY-MM` — the month arrows |
| `page`, `page_size` | pagination |
| `search` | matches rep name **or** employee code, case-insensitive |
| `status` | `draft` \| `pending_approval` \| `approved` \| `superseded` |
| `has_flags` | `true` = "Needs a look", `false` = "Clean" |
| `city` | exact match on territory — options come back in the response |
| `flag_code` | `beat_under_covered` \| `day_missing_beat` \| `displaced_by_non_working_day` \| `remaining` |
| `coverage_min`, `coverage_max` | 0–100, inclusive — a coverage band |
| `sort_by` | `sales_incharge` \| `coverage` \| `working_days` \| `beats_scheduled` (the four sortable columns) |
| `sort_order` | `asc` \| `desc` |

Response:

```jsonc
{
  "journey_plans": [{
    "id": 12, "sales_incharge_id": 7,
    "sales_incharge_name": "Mehulbhai Solanki",
    "sales_incharge_code": "SI-1000",
    "sales_incharge_city": "Anand",
    "status": "pending_approval",
    "coverage_percentage": 84,
    "working_days": 26,
    "beats_scheduled": 33,
    "flag_count": 1,
    "flag_codes": ["beat_under_covered"],     // why it's flagged, without opening it
    "month_rhythm": [                          // one entry per CALENDAR day, in order
      { "date": "2026-07-01", "activity_code": "retailing", "beat_count": 1, "flagged": false }
    ]
  }],
  "summary": {
    "average_coverage": 55,
    "clean_plans": 9, "flagged_plans": 51, "approved_plans": 17,
    "generated_at": "2026-06-25T03:41:00.000Z",
    "reviewed_percentage": 28,
    "filter_options": { "cities": ["Anand", "Junagadh"], "flag_codes": ["beat_under_covered"] }
  },
  "total": 60, "page": 1, "page_size": 10, "total_pages": 6
}
```

**`summary` is computed over the WHOLE period, not the page** — so the stat
cards and the tab counts stay correct while you page and filter. Wire the four
cards and the four tab badges to `summary`, never to `journey_plans.length`.
"43 awaiting review" is `total − approved_plans`.

**`filter_options` is computed before filtering.** Populate the Filters panel
from it directly; it will not shrink as the user narrows, and it never offers a
city with nothing behind it.

**`month_rhythm`** is the little bar strip. One entry per calendar day including
non-working ones, in date order. Colour by `activity_code` (`weekly_off`,
`holiday`, `leave` are distinct codes), draw `beat_count` segments, and treat
`flagged` as its own overlay — a flagged day is not an activity value.

Actions:

```
POST /journey-plans/:id/approve                            → the approved plan
POST /journey-plans/bulk-approve  { journey_plan_ids: [] } → per-id outcomes
```

Bulk-approve reports each id as `approved` \| `skipped_flagged` \|
`skipped_status` \| `not_found` plus `approved` / `skipped` counts. **It refuses
flagged plans** — that is what makes the button "Approve N *clean*". To collect
those ids first, call the list with `has_flags=false&status=pending_approval&page_size=100`.

Generation, if the panel needs it:

```
POST /journey-plans/generate
  { period_month: "2026-07", sales_incharge_ids?: [], supersede_existing?: false, seed?: string }
```

Idempotent per rep and period: it **refuses** when a live plan exists unless
`supersede_existing` is explicitly true. Per-rep outcomes come back as
`created` \| `skipped_existing` \| `no_beats` \| `failed`.

> ⚠️ **The "Sent back" badge and the ↺ row action have no backend.** The status
> enum is `draft | pending_approval | approved | superseded` — there is no
> send-back state and no endpoint. This is a known open question with the
> backend team; **do not build against a `sent_back` status.** If ↺ is meant to
> be "re-solve", that endpoint exists (§3.2). Also note `superseded` has no
> design treatment yet — a re-solved plan will arrive in that state.

---

### 3.2 Journey Plan detail

```
GET /journey-plans/:id
GET /journey-plans/reps?period_month=2026-07     // the rep switcher dropdown
```

`/reps` returns `{ sales_incharges: [{ sales_incharge_id, sales_incharge_name,
sales_incharge_code, journey_plan_id, status }] }` — it already carries the plan
id, so switching rep is a client-side navigation with no extra lookup.

Detail response, the parts the screen uses:

```jsonc
{
  "id": 12,
  "sales_incharge_name": "Satishbhai Joshi", "sales_incharge_code": "SI-9889",
  "sales_incharge_city": "Bhavnagar",
  "period_month": "2026-07-01",            // always the 1st
  "status": "pending_approval",
  "generated_at": "2026-06-25T03:48:00.000Z",
  "generated_by": "solver",                 // solver | manual | import

  "coverage_percentage": 63,
  "beats_scheduled": 32,
  "working_days": 24, "total_days": 31,     // "24 working / 31 days"
  "planned_travel_km": 1728,
  "avg_km_per_day": 72,                     // NULLABLE — see below

  "flags": [{
    "code": "beat_under_covered",
    "date": null, "beat_id": 4, "beat_name": "Thangadh Tarnetar Road",
    "outlet_count": 60,                     // the EXPOSURE, not just the fact
    "facts": { "scheduled": 1, "required": 2 }
  }],
  "flag_summary": {                          // the capped tail of flags[], per kind
    "remaining_count": 12,                   // hidden flags across all kinds
    // Most severe first — render in this order. WORD EACH ROW FROM `code`: the
    // remainder is not all under-coverage. `beat_count` is the distinct beats the
    // kind names (0 when it names none), deduped within a kind, never across.
    "remaining_by_code": [
      { "code": "beat_under_covered",           "count": 8, "beat_count": 8, "outlet_count": 220 },
      { "code": "displaced_by_non_working_day", "count": 3, "beat_count": 2, "outlet_count": 47 },
      { "code": "day_missing_beat",             "count": 1, "beat_count": 0, "outlet_count": 0 }
    ]
  },
  "flag_count": 18,                         // TOTAL, including the rolled-up remainder

  "days": [{
    "id": 501, "date": "2026-07-01", "sequence": 1,
    "activity_id": 1, "activity_code": "retailing", "activity_name": "Retailing",
    "beats": [{ "id": 900, "beat_id": 4, "beat_name": "Gondal Sanala Road",
                "workload": "full_day", "source": "assigned",
                "sequence": 1, "stop_count": 42, "locked": false }],
    "joint_working_sales_incharge_id": null, "joint_working_sales_incharge_name": null,
    "reason": null,
    "locked": false, "locked_at": null,
    "solver_reason": { "rule": "cycle", "facts": { "visits_per_month": 4 } }
  }]
}
```

**`avg_km_per_day` is nullable, and null ≠ 0.** It is null when the rep's beats
have no coordinates — the travel load is *unmeasurable*, not zero. Render "—",
never "0 km". Zero would read as an excellent plan.

**The WHY column comes from `solver_reason`, which is structured, not prose.**
Render `rule` to a phrase yourself: `cycle` → "Weekly cycle" / "Fortnightly
cycle" (use `facts.visits_per_month`), `half_day_pair` → "Two half-days paired",
`load_balance`, `travel_adjacency`, `consecutive_day_avoidance`, `pinned`,
`fixed`. It is deliberately not a prewritten sentence so it can be re-rendered
in Gujarati later.

**The last flag is a rollup.** `flags[]` is capped; `flag_summary` carries the
remainder ("12 more allocated beats miss their cycle — 267 outlets between
them"). The client cannot compute that itself — it does not have the beats it
never received. Render `flag_summary` as a final row when non-null, and use
`flag_count` (not `flags.length`) for the badge.

**Locks.** `days[].locked` and `beats[].locked` mean the day has started and is
history. Disable those controls — an edit attempt returns `409`.

Edits (each returns the updated plan detail, so replace state wholesale):

```
PATCH  /journey-plans/:id/days/:day_id
       { activity_id, reason?, joint_working_sales_incharge_id? }
POST   /journey-plans/:id/days/:day_id/beats            { beat_id }
DELETE /journey-plans/:id/days/:day_id/beats/:beat_id
POST   /journey-plans/:id/re-solve  { pinned_dates?: [], seed? }
POST   /journey-plans/:id/approve
```

Activity dropdown options: `GET /activities?page_size=100`. Beat options for
adding: `GET /sales-incharges/:id/beats` (the rep's allocated beats).

**Switching to a beatless activity clears the day's beats** — the server does it
for you, so refetch rather than reconciling locally.

**Re-solve returns a diff**, not just the plan:

```jsonc
{ "journey_plan": { ...detail }, "diff": {
    "entries": [{ "date": "2026-07-09", "removed_beat_ids": [4], "added_beat_ids": [7], "activity_changed": false }],
    "days_changed": 6, "beats_moved": 9, "days_held": 4 } }
```

Show the diff before committing the view. `pinned_dates` are days the admin has
hand-edited and wants held; **locked days are held regardless** and count into
`days_held`. Re-solve **supersedes** the plan — `journey_plan.id` will be a
*new* id. Update your route params from the response.

Expected errors: `409 JOURNEY_PLAN_DAY_LOCKED`, `409 JOURNEY_PLAN_NOT_EDITABLE`
(approved), `409` on a second full-day beat, `403` without `journey-plan:update`.

---

### 3.3 Live Map — month

```
GET /live-day/summaries?sales_incharge_id=7&from_date=2026-07-01&to_date=2026-07-31
```

Not paginated — it returns every date in the window (**capped at 31 days**;
a longer range is silently clamped, not rejected). Page the cards client-side.

```jsonc
{
  "rep_day_summaries": [{
    "date": "2026-07-01",
    "status": "worked",                    // worked | official_work | leave | holiday | weekly_off | not_started
    "activity_code": "retailing", "activity_name": "Retailing",
    "beat_id": 4, "beat_name": "Gondal Sanala Road",
    "counters": { "sc": 7, "tc": 7, "in_turn": 7, "ovt": 0, "to": 0, "pc": 3, "ovc": 0 },
    "distance_metres": 11000,
    "mock_suspected_count": 0,             // > 0 ⇒ the GPS-flagged badge
    "day_start_at": "2026-07-01T04:15:00.000Z",
    "day_end_at":   "2026-07-01T06:19:00.000Z",
    "day_start_address": null              // see §6
  }],
  "totals": {
    "days": 31, "days_on_field": 24, "off_days": 7, "gps_flagged_days": 1,
    "total_calls": 168, "productive_calls": 50,
    "productivity_percentage": 30, "avg_calls_per_day": 7,
    "distance_metres": 1898000
  }
}
```

Wire the five header cards and the "1,898 km travelled" line to **`totals`** —
it is already computed over the whole range. The four filter chips map to
`totals.days` / `days_on_field` / `off_days` / `gps_flagged_days`.

**`status` and `activity_name` are different questions** and both are returned:
status answers *did he work*, activity answers *at what*. A plan can say
Retailing on a day nobody worked. The card badge is `activity_name`; the
on-field/off-day grouping is `status`.

`avg_calls_per_day` divides by **days on field**, not calendar days — do not
recompute it against `days`.

---

### 3.4 Live Day

```
GET /live-day/detail?sales_incharge_id=7&date=2026-07-01
```

```jsonc
{
  "date": "2026-07-01", "status": "worked",
  "counters": { "sc": 7, "tc": 7, "in_turn": 7, "ovt": 0, "to": 2, "pc": 3, "ovc": 0 },
  "assigned_beat": { "id": 4, "name": "Gondal Sanala Road" },
  "selected_beat": { "id": 4, "name": "Gondal Sanala Road" },
  "total_distance_metres": 11000,
  "mock_suspected_count": 0,

  "attendance": {
    "day_start_at": "...", "day_end_at": "...",
    "elapsed_seconds": 7440,      // ← "On field 2h 04m"
    "working_seconds": 6300,      // NOT the same number
    "break_seconds": 1140, "session_count": 1,
    "check_in_latitude": "22.300000", "check_in_longitude": "70.800000",
    "day_start_address": null, "day_end_address": null
  },

  "timeline": [{ "visit_id": 1, "day_sequence": 1, "at": "...",
                 "party_name": "Umiya Super Market", "beat_name": "Gondal Sanala Road",
                 "call_type": "in_turn", "is_productive": false,
                 "order_value": null, "dwell_seconds": 360,
                 "latitude": "22.30", "longitude": "70.80", "reason": null }],

  "route": {
    "drawable": true,
    "state": "ok",                                  // ok | no_day_start | no_mapped_points
    "origin": { "latitude": "22.300000", "longitude": "70.800000" },
    "distance_metres": 9800,
    "points": [{ "sequence": 1, "visit_id": 2, "journey_plan_stop_id": 88,
                 "party_name": "Patel Dairy", "latitude": "...", "longitude": "...",
                 "day_sequence": 2, "at": "...", "is_productive": true }]
  },

  "not_visited": [{ "stop_id": 91, "stop_type": "retailer", "party_id": 104,
                    "party_name": "Umiya Dairy & Cold",
                    "latitude": "...", "longitude": "...", "planned_sequence": 6 }],

  "facets": { "in_turn": 7, "telephonic": 0, "ovt": 0, "ovc": 0, "joint_working": 0,
              "not_visited": 2, "distributor": 0, "official_work": 0, "productive": 3 }
}
```

The nine `facets` map 1:1 onto the nine filter chips. `not_visited` carries
coordinates because those are **map markers**, not just a list.

#### The map polyline — read this before drawing

**`route` is a reconstruction, not a GPS trail.** No breadcrumb track is stored
anywhere. What exists is one fix per visit, so `route.points` is the **shortest
walk through those fixes, anchored at the rep's day-start coordinate**.

- **`drawable: false` ⇒ render markers and NO line.** Two cases:
  `no_day_start` (he never checked in, so there is no anchor and a "shortest
  route" would be fiction) and `no_mapped_points` (nothing that day carried a
  fix — e.g. a telephonic-only day). Points are still returned in
  chronological order so you can drop markers. Surface `state` in the UI so the
  user knows *why* there's no line.
- **Draw from `route.origin` first**, then through `points` in `sequence` order.
  The origin is the green start flag.
- **`sequence` ≠ `day_sequence`.** `sequence` is the optimised route order;
  `day_sequence` is the chronological order, carried on every point. They
  disagree when the rep backtracked. Number the map pins by `sequence`, number
  the timeline by `day_sequence`, and don't try to make them agree.
- Likewise `route.distance_metres` (optimised) ≠ `total_distance_metres`
  (chronological). The gap between them *is* the backtracking.

#### Two durations, and they are different numbers

`elapsed_seconds` = check-in to check-out **including breaks** — this is the
design's "On field" figure. `working_seconds` = the same span **minus breaks**.
Label them distinctly and never present one as the other.

`attendance.*` is **entirely null when there is no session**, and everything else
in the response is still populated. A rep whose phone never checked in still has
a plan and may still have visits — the screen must render.

---

### 3.5 "Ask for a change" — the AI agent

Claude Sonnet 5 on Bedrock, running a tool loop server-side. It **writes
directly** to the plan — with the same permissions, locks and refusals as a
human admin — and the plan stays a draft until someone hits Approve.

One conversation per **sales incharge + period**, not per plan id (a re-solve
supersedes the plan being discussed).

```
GET  /journey-plans/:id/agent                      → 200, the conversation
POST /journey-plans/:id/agent/messages { message } → 202, accepted-and-running
```

`GET` returns:

```jsonc
{ "conversation_id": 31, "journey_plan_id": 12,
  "period_month": "2026-07-01", "sales_incharge_id": 7,
  "room": "journey-plan-agent:31",
  "event": "journey-plan-agent",
  "enabled": true,                    // false ⇒ Bedrock not configured; disable the composer
  "messages": [ ...full transcript... ] }
```

#### Connection order — get this wrong and you lose the first tokens

```
1. connect the socket to namespace /salesInchargeAdmin
2. GET  /journey-plans/:id/agent          ← this ISSUES the room grant
3. emit "journey-plan-agent:join" { conversation_id }  → ack { ok: true }
4. render the transcript from step 2
5. POST /journey-plans/:id/agent/messages { message }   → 202
6. consume "journey-plan-agent" events
```

**Step 2 must precede step 3.** The `GET` is what authorizes your socket — the
API records a short-lived grant in Redis keyed by room *and* subject, and the
realtime service does nothing but look it up. Joining before the `GET` acks
`{ ok: false, error: "not permitted" }`.

**Step 3 must precede step 5.** The room has no replay; anything emitted before
you join is gone.

**On reconnect, repeat 2→3→4.** The `GET` re-issues the grant (grants expire) and
returns the full transcript, so a turn that finished while you were disconnected
is recovered. `emit "journey-plan-agent:leave" { conversation_id }` when the
panel closes.

#### Stream events (all under event name `journey-plan-agent`)

| `type` | Payload | UI |
|---|---|---|
| `turn_started` | `conversation_id`, `user_message_id` | disable composer, show working state |
| `text_delta` | `text` | **append in arrival order** |
| `thinking_started` | — | "Thinking…" — carries no content by design |
| `tool_started` | `name`, `input` | activity log row; `input` is always complete, never partial |
| `tool_finished` | `name`, `ok`, `summary` | close the row; `ok: false` is a refusal, show `summary` |
| `plan_changed` | `journey_plan_id`, `reason` | **refetch `GET /journey-plans/:id`** — do not patch locally |
| `turn_finished` | `assistant_message_id`, `stop_reason`, `usage` | terminal — re-enable composer |
| `turn_failed` | `message` | terminal — re-enable composer, show the message |

**`turn_finished` and `turn_failed` are mutually exclusive and both terminal.**
Handle both or a failed turn leaves the composer disabled forever.

**On `plan_changed`, always refetch.** The agent may have made several edits, and
coverage/flags are recomputed server-side. If `journey_plan_id` differs from the
one you have, the agent re-solved — navigate to the new id.

#### Transcript rendering

`messages[].content` is a raw array of Anthropic content blocks, passed through
rather than flattened, so you can render tool activity differently from prose.
Roles are `user` \| `assistant` \| `tool_result`.

- Render blocks with `type: "text"` as prose.
- Render `type: "tool_use"` as an activity row (`name`, `input`).
- **Do not render `tool_result` messages as chat bubbles** — they are raw JSON
  payloads for the model. Fold them into the matching activity row or hide them.
- **Do not render `thinking` blocks.** They arrive with empty text by design.
- `messages[].error` non-null marks a failed turn — render it as an error, not a
  gap.

The opening greeting in the design ("I have Satishbhai Joshi's July 2026 plan
open…") is **client-side copy** — a new conversation starts empty. The
suggestion chips are client-side too; there is no endpoint for them.

#### What the agent can and cannot do

Tools: `get_plan`, `list_allocated_beats`, `list_activities`, `explain_day`,
`update_day`, `add_day_beat`, `remove_day_beat`, `re_solve_plan`.

**There is no approve tool** — approval stays a human action. Every write goes
through the same command the REST route uses with the same actor, so an admin
without `journey-plan:update` gets a read-only assistant, and a locked day
refuses the agent exactly as it refuses a human.

---

### 3.6 Supporting masters

```
GET    /activities?page_size=100                     // paginated: { activities: [], total, page, ... }
       // filters: search, status, requires_beat, is_working_day, counts_toward_coverage
POST   /activities        { code, name, sort_order, requires_beat, is_working_day, counts_toward_coverage }
PATCH  /activities/:id
DELETE /activities/:id

GET    /sales-incharges/:id/beats                    // the rep's allocated beats
GET    /sales-incharges/:id/available-beats          // allocatable to them
POST   /sales-incharges/:id/beats        { beat_id }
DELETE /sales-incharges/:id/beats/:beat_id

GET    /beats/nearest?latitude=&longitude=           // by neighbour vote, not centroid
GET    /beats/:id/members                            // a beat's outlets
GET    /retailers/:id/beat-memberships               // an outlet's beat history
PATCH  /retailers/:id/beat-membership                // move an outlet to another beat
```

The three activity booleans are **editable and load-bearing** — the solver reads
them. They have constraints the API enforces with a `400`: an activity that
counts toward coverage must require a beat; one that requires a beat must be a
working day. Validate the same way in the form so the user sees it before
submitting. `company_id: null` marks the 12 seeded platform activities, which no
tenant may edit — disable those rows.

---

## 4. Socket.IO — a complete walkthrough

Written for a first socket implementation in this codebase. The agent chat is
the only consumer today, so everything here is scoped to that.

### 4.1 The four words, because three of them look interchangeable

| Term | Value here | What it is |
|---|---|---|
| **Path** | `/socket.io` | The HTTP route the transport itself lives on. Set via the `path` **option**. The load balancer forwards this prefix to the realtime container. |
| **Namespace** | `/salesInchargeAdmin` | A logical channel, appended to the **connect URL**. One per audience; the handshake checks your token was minted for *this* one. |
| **Room** | `journey-plan-agent:31` | A subset of sockets inside a namespace. You ask to join; the server decides. Never guess the name — the API returns it. |
| **Event** | `journey-plan-agent` | The message name you listen on. Every agent frame arrives under this one name, with a `type` field inside. |

Putting the namespace in `path`, or the path in the URL, produces a handshake
404. The distinction is: **path is transport plumbing, namespace is addressing.**

### 4.2 Install

```bash
pnpm add socket.io-client        # v4.x
```

### 4.3 A singleton client

**Create ONE socket for the whole app**, not one per component. Each `io()` call
with a new URL opens a new connection; a component that creates its own on mount
leaks a connection on every remount.

```ts
// src/lib/realtime.ts
import { io, type Socket } from "socket.io-client";

const REALTIME_URL = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE_URL;   // same origin as the API when deployed

let socket: Socket | null = null;

/** The shared socket for this audience. Safe to call repeatedly. */
export function getSocket(getAccessToken: () => string | null): Socket {
  if (socket) return socket;

  socket = io(`${REALTIME_URL}/salesInchargeAdmin`, {
    path: "/socket.io",
    // A FUNCTION, not a value. Socket.IO calls it on every (re)connect, so a
    // refreshed token is picked up automatically. Passing `{ token }` directly
    // freezes the token at construction and every reconnect after expiry fails.
    auth: (cb) => cb({ token: getAccessToken() }),
    transports: ["websocket", "polling"],
    autoConnect: false,          // connect explicitly, after login
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });

  return socket;
}

/** Call on logout. The next getSocket() builds a fresh one with the new token. */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

**Do not connect before you have an access token.** Call `socket.connect()` once
the user is authenticated, and `disconnectSocket()` on logout.

### 4.4 Lifecycle events you must handle

```ts
socket.on("connect", () => {
  // Fires on the FIRST connect AND on every reconnect. See 4.6 — this is where
  // rooms get re-joined, because the server does not remember them.
});

socket.on("disconnect", (reason) => {
  // "io server disconnect" ⇒ the server closed it deliberately; you must call
  // socket.connect() yourself. Every other reason auto-reconnects.
  if (reason === "io server disconnect") socket.connect();
});

socket.on("connect_error", (err) => {
  // Handshake rejections land here — bad/expired token, wrong namespace, or
  // the service being unreachable. `err.message` carries the server's reason.
  console.warn("realtime handshake failed:", err.message);
});
```

`connect_error` is **not** fatal by itself: the client keeps retrying on the
backoff configured above. Treat it as "degraded", not "broken" — see §4.8.

### 4.5 Joining a room, with an acknowledgement

Emits can take a callback; the server calls it with a result. Ours does, and you
must check it — a denied join is silent otherwise.

```ts
socket.emit(
  "journey-plan-agent:join",
  { conversation_id: 31 },
  (res: { ok: boolean; error?: string }) => {
    if (!res.ok) {
      // Almost always: the grant expired or was never issued. Re-fetch
      // GET /journey-plans/:id/agent (which re-issues it) and join again.
    }
  },
);

socket.emit("journey-plan-agent:leave", { conversation_id: 31 });  // no ack
```

**You are not authorized by connecting.** Connecting proves who you are; joining
a room proves you may read *that conversation*. The `GET` in §3.5 is what
authorizes the join — the API records a short-lived grant, and the realtime
service only looks it up.

### 4.6 Reconnects do NOT restore rooms — the trap

Socket.IO rooms live on the server for the lifetime of one connection. When the
client reconnects it gets a **new** connection, in no rooms. The library
reconnects for you and does not re-join for you.

So the room join must be driven by the `connect` event, not run once on mount:

```ts
// WRONG — joins once. After the first network blip, events stop arriving
// forever, with no error anywhere.
useEffect(() => {
  socket.emit("journey-plan-agent:join", { conversation_id });
}, [conversation_id]);

// RIGHT — re-joins on every connect, including reconnects.
useEffect(() => {
  const join = () => socket.emit("journey-plan-agent:join", { conversation_id }, handleAck);
  if (socket.connected) join();
  socket.on("connect", join);
  return () => { socket.off("connect", join); };
}, [conversation_id]);
```

And because the grant expires, a reconnect after a long gap should **re-fetch
the conversation first** — that re-issues the grant *and* returns the transcript
you missed while disconnected. The room has no replay; refetching is the only
way to recover a turn that completed during the gap.

### 4.7 Listening, and cleaning up

Every agent frame arrives under the single event name `journey-plan-agent`,
discriminated by `type` (the table in §3.5).

```ts
type AgentStreamEvent =
  | { type: "turn_started"; conversation_id: number; user_message_id: number }
  | { type: "text_delta"; text: string }
  | { type: "thinking_started" }
  | { type: "tool_started"; name: string; input: unknown }
  | { type: "tool_finished"; name: string; ok: boolean; summary: string }
  | { type: "plan_changed"; journey_plan_id: number; reason: string }
  | { type: "turn_finished"; assistant_message_id: number; stop_reason: string | null; usage: unknown }
  | { type: "turn_failed"; message: string };
```

**Always remove the listener in the cleanup function.** A missing `off` is the
classic React socket bug: the component remounts, a second identical handler is
added, and every `text_delta` gets appended twice — which looks like the model
stuttering rather than like a leak.

```ts
useEffect(() => {
  const onEvent = (event: AgentStreamEvent) => { /* reduce into state */ };
  socket.on("journey-plan-agent", onEvent);
  return () => { socket.off("journey-plan-agent", onEvent); };   // ← required
}, []);
```

Pass the **same function reference** to `off` that you gave to `on`. An inline
arrow in both places removes nothing.

### 4.8 Putting it together — the agent panel

```ts
function useAgentChat(journeyPlanId: number) {
  const socket = getSocket(getAccessToken);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [activity, setActivity] = useState<ToolActivity[]>([]);
  const [busy, setBusy] = useState(false);

  // 1. Connect (idempotent — no-op if already connected).
  useEffect(() => { socket.connect(); }, [socket]);

  // 2 + 3. Fetch the conversation (issues the grant), then join. Re-runs on
  //        every reconnect, so a dropped socket self-heals.
  useEffect(() => {
    let cancelled = false;

    const attach = async () => {
      const convo = await api.get(`/journey-plans/${journeyPlanId}/agent`);
      if (cancelled) return;
      setConversation(convo);                       // 4. render the transcript
      socket.emit("journey-plan-agent:join", { conversation_id: convo.conversation_id },
        (res: { ok: boolean }) => { if (!res.ok) console.warn("join denied"); });
    };

    void attach();
    socket.on("connect", attach);
    return () => {
      cancelled = true;
      socket.off("connect", attach);
      if (conversation) {
        socket.emit("journey-plan-agent:leave", { conversation_id: conversation.conversation_id });
      }
    };
  }, [journeyPlanId, socket]);

  // 6. Consume the stream.
  useEffect(() => {
    const onEvent = (e: AgentStreamEvent) => {
      switch (e.type) {
        case "turn_started":     setBusy(true); setStreamingText(""); setActivity([]); break;
        case "text_delta":       setStreamingText((t) => t + e.text); break;
        case "thinking_started": setActivity((a) => [...a, { kind: "thinking" }]); break;
        case "tool_started":     setActivity((a) => [...a, { kind: "tool", name: e.name, running: true }]); break;
        case "tool_finished":    setActivity((a) => closeTool(a, e)); break;
        case "plan_changed":     void refetchPlan(e.journey_plan_id); break;
        case "turn_finished":
        case "turn_failed":
          // BOTH are terminal. Handling only one leaves the composer dead.
          setBusy(false);
          void refetchConversation();     // canonical transcript replaces the buffer
          break;
      }
    };
    socket.on("journey-plan-agent", onEvent);
    return () => { socket.off("journey-plan-agent", onEvent); };
  }, [socket]);

  // 5. Send. Returns 202 — the answer arrives over the socket, not here.
  const send = async (message: string) => {
    setBusy(true);
    await api.post(`/journey-plans/${journeyPlanId}/agent/messages`, { message });
  };

  return { conversation, streamingText, activity, busy, send };
}
```

On `turn_finished` / `turn_failed`, refetch the conversation and drop your
locally accumulated `streamingText`. The persisted transcript is canonical; your
buffer is a live preview of it.

### 4.9 Degrading when the socket is down

> ⚠️ **The handshake currently rejects every connection.** JWT verification in
> the realtime service is still a stub pending a backend change, so every
> `connect` fails with `connect_error` today.

Build the socket layer anyway, but make the panel work without it: `POST` the
message as normal, then poll `GET /journey-plans/:id/agent` every few seconds
until the last message is an assistant message. You lose token-by-token
streaming, not the feature.

That is worth building regardless of the stub — it is the same code path the
reconnect case needs, and a user on a bad connection hits it in production.

### 4.10 Testing the socket without the UI

```js
// node --input-type=module, or paste into the browser console on the panel origin
import { io } from "socket.io-client";
const s = io("http://localhost:3001/salesInchargeAdmin", {
  path: "/socket.io",
  auth: { token: "<paste an access token>" },
});
s.on("connect", () => console.log("connected", s.id));
s.on("connect_error", (e) => console.log("REJECTED:", e.message));
s.onAny((event, ...args) => console.log("EVENT", event, args));
s.emit("journey-plan-agent:join", { conversation_id: 1 }, console.log);
```

`socket.onAny` logs every inbound event and is the fastest way to see whether
frames are arriving at all before debugging your reducer.

### 4.11 Checklist of the mistakes that actually happen

- [ ] One socket for the app, not one per component
- [ ] `auth` as a **function** so reconnects pick up a refreshed token
- [ ] Room re-joined on **every** `connect`, not once on mount
- [ ] Conversation fetched **before** joining (that call issues the grant)
- [ ] Joined **before** POSTing the message (the room has no replay)
- [ ] Join acknowledgement checked for `ok: false`
- [ ] Every `on` paired with an `off` using the **same function reference**
- [ ] `turn_finished` **and** `turn_failed` both treated as terminal
- [ ] `plan_changed` triggers a refetch, never a local patch
- [ ] Panel still usable when `connect_error` fires

---

## 5. Definitions you must not re-derive

These will be compared against FieldAssist's numbers on day one. Display them;
do not recompute them.

```
TC  = in_turn + ovt + to        (visits not out-of-compliance)
OVC sits OUTSIDE TC             — it is not part of that sum
PC  ⊂ TC                        (the productive subset)
SC  = planned stops from ASSIGNED beats only
```

**`SC` reads 0 for a day whose beat the rep chose himself.** That is correct, not
a bug: nothing was planned. It is why `assigned_beat` and `selected_beat` are
reported separately — when they differ, the rep deviated, and that is the
signal.

**Coverage** is measured against the rep's **allocated** beats, not the beats
that appear in the plan — otherwise a plan that forgot a beat entirely would
score 100%. It is capped at 100 so over-scheduling one beat cannot mask
under-scheduling another.

---

## 6. Known nulls — expected, not bugs

| Field | Why |
|---|---|
| `day_start_address`, `day_end_address` | Attendance (a different team's module) stores coordinates but no address. The columns have been requested. We do not reverse-geocode on their behalf. Show the coordinates or a placeholder. |
| `ovc` — always 0 | The compliance evaluator is not built yet. The arithmetic is written for the day it lands. |
| `order_value` — always null | The orders module is not built yet. |
| `avg_km_per_day` — sometimes null | Unpinned beats. Render "—", never "0". |
| `enabled: false` on the agent | Bedrock is off in this environment. Disable the composer up front rather than failing on send. |

## 7. Not built — do not design against these

- **No `sent_back` status or endpoint** (see §3.1).
- **No GPS breadcrumb trail.** Live location is broadcast and discarded; there
  is no historical track API. `route` (§3.4) is the substitute.
- **No dashboard endpoint** for the sidebar's Dashboard item.
- **Orders, dispatch, collections** — specced but not implemented.

## 8. Where to look next

- Full schemas: `/sales-incharge-admin/docs`
- Backend conventions and architecture: `CLAUDE.md`, `docs/MAP.md` in the API repo
