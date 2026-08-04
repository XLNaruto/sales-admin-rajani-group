# Journey management — the API contract

For the web panel (Sales Admin) and the mobile app (Sales Incharge).

> **This replaces an earlier design.** If you have screens or types built against
> journey plans as a **calendar** — with `status`, approve, bulk-approve,
> re-solve, day editing, `coverage_percentage` or a period summary — none of
> those endpoints or fields exist any more. §0 says exactly what went and why.

---

## 0. The model, in one page

**A journey plan is an ALLOCATION for one rep for one month. It is not a
calendar.** It holds two things:

| | |
|---|---|
| **Beat list** | Which of the rep's beats are in play this month. **No per-beat counts.** A rep is permanently allocated 60+ beats and cannot work them all, so choosing *which* is the decision; how many times each is almost always once. |
| **Pinned days** | The handful of dates the office fixes for everyone — the monthly meeting, a training day, the weekly offs. |

Everything else belongs to the rep. Each morning he picks his activity, checks
in, and picks a beat. **That is what writes a day row.** So most dates in a
future month have no entry at all, and that is the normal state — not a gap for
the UI to fill or flag.

### What was removed, and why

| Gone | Why |
|---|---|
| `status` (`draft`/`pending_approval`/`approved`/`superseded`) | Nothing to approve. An allocation is live the moment it exists. |
| `POST /:id/approve`, `POST /bulk-approve` | Approving a target the rep is free to ignore is ceremony. |
| `GET /journey-plans/summary` | Every count it returned was by approval status. |
| `POST /:id/re-solve`, `supersedes_plan_id`, solver replay fields | Nothing to re-solve — there is no calendar to rebuild. |
| `PATCH /:id/days/:day_id`, day-beat add/remove | The admin does not edit days. The **rep** writes them from the app. |
| `POST /materialise-stops` | Stops snapshot when the rep picks his beat. Nothing runs ahead. |
| `coverage_percentage`, `planned_travel_km`, `avg_km_per_day` | Measured a plan that said *which beat on which date*. No such plan exists. Progress is now `beats_worked / beats_allocated`. |
| `beats.workload` (half-day/full-day) | Never populated, and its pairing rule is gone. |
| `source: assigned \| selected` on a day's beat | Every beat is now the rep's own choice. The deviation signal is `on_allocation`. |
| Activity quotas | There are none. An activity is either pinned by the admin or chosen by the rep; nothing plans "20 retailing days". |

### The two numbers that replaced them

- **`beats_allocated`** — beats on the month's list (planned).
- **`beats_worked`** — distinct **listed** beats worked at least once (actual).
  A beat worked off-list does **not** count; that is a deviation, not progress.
- **`completion_percentage`** = worked / allocated. **0% when nothing is
  allocated**, not 100% — a rep with no beats has not finished his month, he
  was never given one, and that is a flag.

---

## 1. Conventions

- Wire fields are **snake_case**. Dates are `YYYY-MM-DD` strings; timestamps are
  ISO-8601 UTC.
- Coordinates are **strings** (`"22.300000"`). Parse them; do not assume float.
- Lists are page-based: `?page=1&page_size=20`, response
  `{ <resource>: [...], total, page, page_size, total_pages }`.
- Errors are `{ error: "CODE", message: "..." }`.
- **Boolean query params** accept only `true` / `false` / `1` / `0`. Anything
  else is a 400 rather than a silent `true`.

---

## 2. Sales Admin — the allocation screens

### 2.1 List — `GET /sales-incharge-admin/journey-plans`

Query: `period_month` (`YYYY-MM`, required), `search`, `city`, `page`,
`page_size`, `sort_by` (`sales_incharge` | `completion` | `beats_allocated` |
`beats_worked`), `sort_order`.

**There are no status tabs and no flag filters.** The old queue had
*Pending / Approved* tabs and a "Needs a look" filter; nothing has a status to
filter by now. If the screen needs a worklist, sort by `completion` ascending or
scan the `flags` on each row.

Each row:

```jsonc
{
  "id": 12,
  "sales_incharge_id": 7,
  "sales_incharge_name": "Ramesh Patel",
  "sales_incharge_code": "SI-007",
  "sales_incharge_city": "Halvad",
  "beats_allocated": 22,
  "beats_worked": 9,
  "completion_percentage": 40.9,
  "working_days": 11,
  "flags": [ /* see §2.4 */ ],
  "month_strip": [ /* see §2.3 — one entry per calendar date */ ]
}
```

### 2.2 Detail — `GET /sales-incharge-admin/journey-plans/:id`

Adds `allocated_beats` (the allocation itself), `beats_remaining`, `capacity`,
`total_days`, and `days`.

```jsonc
{
  "allocated_beats": [
    {
      "beat_id": 10, "beat_name": "Halvad Main Bazar", "source": "solver",
      "outlet_count": 34, "visits_per_month": 2, "worked_count": 2,
      "latitude": "22.300000", "longitude": "70.800000"
    }
  ],
  "capacity": 26,
  "days": [ /* ... */ ]
}
```

- `source` — `solver` (proposed by the picker at generate) or `manual` (the
  admin put it there). Anything saved by hand becomes `manual`.
- `worked_count` — times worked this month. **There is no target beside it.**
  Do not render it as `2 / 3`; the allocation carries no per-beat count, and
  `visits_per_month` is the beat's general cycle, not a target for this month.
- `capacity` — dates available to work a beat: the month's days minus the pinned
  ones. **Weekly offs are not subtracted** unless the admin pinned them, because
  nothing knows which day a given rep is off. It feeds only the `over_capacity`
  warning; do not display it as a hard number of available days.

> **`days` is SHORT, and that is correct.** A freshly generated month contains
> only the pinned dates. Draw the calendar from `month_strip`, never from
> `days`.

### 2.3 `month_strip` — one entry per calendar date

```jsonc
{ "date": "2026-08-14", "label": "absent", "activity_code": null, "origin": null, "beat_count": 0 }
```

`label` is **derived at read time** and is the single most important field on
this screen:

| `label` | Meaning | Suggested treatment |
|---|---|---|
| `worked` | A past date the rep chose an activity for. | Normal / filled |
| `planned` | Today or later, activity already set (pinned, or chosen this morning). | Outlined |
| `holiday` | A day row whose activity is not a working day — pinned by the office, or marked by the rep. | Muted |
| `absent` | **A past date with no entry at all.** Nobody said anything and nobody worked. | Warning |
| `unplanned` | Today or later, nothing chosen yet. | Empty / neutral |

**Do not collapse `absent` and `holiday` into one "off" state.** They are the
reason the label exists: a rep who skipped six days must not render identically
to one who had six holidays. Equally, **`unplanned` on a future date is not a
problem** — do not badge it.

`origin` is `pinned` when the office fixed the date and the rep has not
overridden it, `rep` when it is his own choice, `null` when no row exists.

### 2.4 `flags` — inline warnings

Most severe first. They **gate nothing** — an allocation with flags is as live
as one without. Render a marker on the row, not a blocking state.

| `code` | Meaning |
|---|---|
| `no_beats_allocated` | The month's list is empty. The rep has nothing to work. |
| `beat_not_allocated` | A listed beat is no longer allocated to this rep. `outlet_count` is the exposure; `beat_name` is `null` because no beat row survives to read one from. |
| `over_capacity` | More beats listed than working days. `facts: { allocated, capacity, excess }`. |
| `pinned_on_non_working_day` | A pinned date carries a non-working activity. Usually deliberate. |

### 2.5 Generate — `POST /sales-incharge-admin/journey-plans/generate` → `201`

```jsonc
{
  "period_month": "2026-09",
  "sales_incharge_ids": [7, 8],          // omit for every rep in scope
  "pinned_days": [                        // applies to EVERY rep in this run
    { "date": "2026-09-05", "activity_id": 8 },
    { "date": "2026-09-07", "activity_id": 12 }
  ],
  "replace_existing": false,
  "seed": "optional"
}
```

Pinning the weekly offs here is what makes `capacity` accurate. Per-rep pins go
through Save (§2.6).

Response reports per rep: `outcome` is `created` | `replaced` |
`skipped_existing` | `no_beats` | `failed`. **One rep's failure does not fail
the run** — render the list, do not treat a non-zero `failed` as a whole-run
error.

### 2.6 Save — `PATCH /sales-incharge-admin/journey-plans/:id` → `200`

The entire admin write surface. One screen, one Save button, one call.

```jsonc
{
  "beats": [10, 11, 14],                              // full replacement
  "pinned_days": [{ "date": "2026-09-05", "activity_id": 8 }]  // full replacement
}
```

Both fields are **full replacements**, not deltas — send the whole list. Both
are optional; an omitted field is left alone. Applied in one transaction.
Returns the saved allocation (same shape as §2.2).

**Two kinds of day row survive a `pinned_days` replacement whatever you send:**
a **locked** day (a visit landed on it) and a date the **rep has already taken
over**. So a stale screen cannot silently un-choose a rep's morning. After
saving, re-read the response rather than assuming every pin landed.

Refusals (`400`): a beat not allocated to the rep
(`JOURNEY_PLAN_BEAT_NOT_ALLOCATED`), an unknown activity, a pinned date outside
the period, or two activities on one date.

### 2.7 Rep switcher — `GET /sales-incharge-admin/journey-plans/reps?period_month=`

`{ sales_incharges: [{ sales_incharge_id, sales_incharge_name, sales_incharge_code, journey_plan_id }] }`.
Deliberately carries no metrics.

---

## 3. Sales Incharge app — the morning

**Order matters.**

```
GET  /sales-incharge/my-month              what I was allocated
POST /sales-incharge/my-day/activity       1. what am I doing today?
     (attendance check-in)                 2. — the attendance module
GET  /sales-incharge/my-day/beat-options   3a. ranked beats, from where I stand
POST /sales-incharge/my-day/beat           3b. this one → outlets download
GET  /sales-incharge/my-day                the offline payload
```

Beat selection is step 3 because the walking order is computed from his actual
check-in position, and the outlet list snapshots at that moment.

> **Connectivity:** he needs a connection at **beat selection**, every day.
> There is no pre-synced outlet list, because the beat was not known the night
> before. Everything after that call works offline.

### 3.1 `GET /my-month?period_month=YYYY-MM` (defaults to this month)

Returns `beats` (the list he may pick from, with `outlet_count`, `worked_count`,
`last_worked_date`), the full `activities` master, `days` already decided, and
`beats_allocated` / `beats_worked`.

Small and slow-changing — cache it. **A month with no allocation returns
`journey_plan_id: null` and empty beats, not a 404**: he can still mark a
holiday.

### 3.2 `POST /my-day/activity` → `201`

```jsonc
{ "date": "2026-08-12", "activity_id": 1, "reason": null, "joint_working_sales_incharge_id": null }
```

Creates the day row. **Runs before check-in** — marking a holiday involves
checking in nowhere.

```jsonc
{ "journey_plan_day_id": 44, "requires_beat": true, "overrode_pinned": false, "beats_cleared": 0 }
```

- `requires_beat: true` → take him to the beat picker, **after** check-in.
- `overrode_pinned: true` → he replaced a date the office fixed. **Allowed.** Show
  a confirmation, not a refusal; the admin sees it as a deviation.
- `beats_cleared` → switching to a beatless activity dropped that many beats and
  their stops. Warn before the call.

Refusals: `404` unknown activity or no allocation for the month; `409`
`JOURNEY_PLAN_DAY_LOCKED`.

### 3.3 `GET /my-day/beat-options?date=` — the ranked picker

```jsonc
{
  "date": "2026-08-12",
  "day_started": true,
  "beats": [
    { "beat_id": 11, "beat_name": "Morbi Road", "rank": 1, "distance_km": 2.4,
      "worked_this_month": 0, "outlet_count": 28, "reason": "due_and_nearest" }
  ]
}
```

Not-yet-worked first; nearest of those at the top of that group. **A suggestion
only** — he may pick any beat and nothing consults this order. Show the order,
highlight rank 1, and render a short phrase from `reason`
(`due_and_nearest` / `due` / `already_worked`).

`day_started: false` means he has not checked in: every `distance_km` is `null`
and the order is by neglect alone. **Do not render a null distance as 0 km.**

### 3.4 `POST /my-day/beat` → `201`

```jsonc
{ "date": "2026-08-12", "beat_id": 11 }
```

```jsonc
{ "journey_plan_day_id": 44, "beat_id": 11, "stops_created": 28,
  "sequenced": true, "on_allocation": true }
```

- `on_allocation: false` → the beat is not on the month's list. **The pick still
  succeeded** — nothing blocks an off-list beat. Optionally note it; the admin
  sees the deviation.
- `sequenced: false` → he had not checked in, so the stops carry only the
  advisory order.

Refusals: `404` no activity chosen yet, or no such beat. `409` the day is
locked, its activity takes no beat, the beat is already on the day, or it would
be a third.

### 3.5 `GET /my-day` — the offline payload

Unchanged in shape except: each entry of `beats` now carries `on_allocation` and
has **lost** `workload` and `source`. `stops[].sequence` remains the "best
available" order — planned once the day has started, advisory before.

---

## 4. Live map

Largely unchanged. Two differences:

- **`sc`** now counts the stops snapshotted for the day's beat — the calls he
  set out to make. It previously counted admin-assigned beats only and read zero
  for a self-chosen one; nothing assigns beats to dates now, so that rule would
  zero it every day.
- **`assigned_beat` / `selected_beat` are gone**, replaced by `beats` (an array,
  in the order he took them) and `on_allocation` (a boolean; `true` on a day
  with no beats at all).

End-of-day coordinates (`day_end_latitude` / `day_end_longitude`,
`check_out_latitude` / `check_out_longitude`) are present and are `null` while a
session is still open — a different null from "no attendance for the day", where
every `day_*` field is null.

---

## 5. Known gaps

- **Leave requests** are not built. A rep marks leave as an ordinary activity;
  there is no apply/approve workflow yet.
- **Absence** is derived (`label: "absent"`), not recorded. There is no
  reason-for-absence field.
- **`capacity`** is optimistic unless the admin pins the weekly offs — see §2.2.
