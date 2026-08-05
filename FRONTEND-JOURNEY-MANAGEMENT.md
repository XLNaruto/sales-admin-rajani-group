# Journey management — the API contract

For the web panel (Sales Admin) and the mobile app (Sales Incharge).

> **This replaces the previous design twice over.** If you have screens built
> against journey plans as a **calendar the solver placed** (v1), or as an
> **allocation of beats the rep improvised against** (v2), neither contract
> holds. §0 says what the model is now and what went. In particular: `status`
> and approval are **back**, `journey_plan_beats` and the day-start beat picker
> are **gone**, and the rep now schedules the whole month in advance.

---

## 0. The model, in one page

**A journey plan is a NEGOTIATION between the sales admin and one rep, for one
month.** It moves through four states, one direction only:

| State       | Who writes         | What it means                                                                                                           |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `draft`     | admin (allocation) | The solver has proposed day-counts per city. **The rep cannot see it at all** — his `GET /my-plan` reports no plan.     |
| `published` | **rep** (schedule) | Released. He dates every allocated day and picks the beats. The admin can still change the counts.                      |
| `submitted` | admin (schedule)   | He has dated everything and handed it back. **He is read-only from here, permanently.**                                 |
| `approved`  | admin (schedule)   | Signed off. The admin may still correct the calendar — a live month has to be fixable — and the rep still never writes. |

There is **no reject and no send-back**. An admin who dislikes a schedule
corrects it and approves. Nothing goes backwards; there is no unpublish and no
unsubmit.

### The admin allocates COUNTS. He never picks a date or a beat.

|                            |                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`activity_allocations`** | `{ activity_id, days_count }` — "one meeting day, four weekly offs, one training day". Only activities flagged **`is_admin_allocatable`** may appear. Field selling never does. |
| **`city_allocations`**     | `{ city_id, days_count }` — "twenty days in Rajkot, seven in Morbi". Only cities the rep's **allocated beats** actually sit in.                                                 |

Which date, and which beats inside the city, are the rep's to decide.

### The counts must add up — and this is enforced twice

- **`POST /journey-plans/:id/publish` is refused** unless
  `sum(activity days) + sum(city days)` equals the number of calendar dates in
  the period. A month published two days short is one the rep can never
  complete. Read `allocation_variance` (0 = ready) and `can_publish`.
- **`POST /journey/my-plan/submit` is refused** unless the rep's schedule
  consumes **each bucket exactly** — checked bucket by bucket, not on the
  totals, because a day moved from Morbi to Rajkot keeps the total right and the
  month wrong. Read `can_submit`.
- **Saving** the schedule requires neither. A half-dated month is the normal
  state of that screen.

### What was removed, and why

| Gone                                                                        | Why                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `journey_plan_beats`, `allocated_beats`, `beats_allocated` / `beats_worked` | The admin allocates **cities**, not beats. Replaced by `city_allocations` and the three day-counts below.            |
| `pinned_days`, `origin: "pinned"`                                           | "The 5th is the meeting" became "one meeting day". `origin` is now `rep \| admin` and marks an **admin correction**. |
| `POST /journey/my-day/activity`, `POST /journey/my-day/beat`                | Both decisions were made a month ago and approved. Replaced by **`POST /journey/my-day/open`**.                      |
| `GET /journey/my-day/beat-options`                                          | Nothing to rank — the beat for a date was agreed a month earlier.                                                    |
| `GET /journey/my-month`                                                     | Replaced by **`GET /journey/my-plan`**, which carries the allocation as well as the schedule.                        |
| `POST /:id/re-solve`                                                        | The solver drafts city counts and the admin edits them in place; re-running would discard his corrections.           |
| `PATCH /:id/days/:day_id`, day-beat add/remove                              | A day is not edited a field at a time. **`PATCH /:id/schedule`** replaces the whole calendar.                        |
| `GET /journey-plans/summary`                                                | The list's `status` filter serves the tabs it used to count.                                                         |
| `label: "absent"` / `"unplanned"`                                           | Replaced by `"missed"` (scheduled, past, never worked) and `"unscheduled"` (no row).                                 |

### The numbers on a plan

Three, not one, because the interesting question changes as the month progresses:

- **`days_allocated`** — what the admin promised.
- **`days_scheduled`** — dates the rep has actually put against it.
  `scheduling_percentage` = scheduled / allocated. **The figure that matters
  before approval.**
- **`days_worked`** — scheduled dates a **visit has landed on** (the day's
  `locked_at` is set). `completion_percentage` = worked / scheduled. **The figure
  that matters after it.** A past scheduled date with no visit is `missed`, not
  worked — do not derive "worked" from `date < today`.

Both percentages read **0% when their denominator is zero**, not 100%.

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

## 2. Sales Admin — the plan screens

### 2.1 List — `GET /sales-incharge-admin/journey-plans`

Query: `period_month` (`YYYY-MM`, required), `status`, `search`, `city`, `page`,
`page_size`, `sort_by` (`sales_incharge` | `status` | `scheduling` |
`completion` | `days_allocated`), `sort_order`.

`status` drives the chain tabs. Sorting by it uses **chain order**
(draft → published → submitted → approved), not alphabetical.

Each row:

```jsonc
{
  "id": 12,
  "sales_incharge_id": 7,
  "sales_incharge_name": "Ramesh Patel",
  "sales_incharge_code": "SI-007",
  "sales_incharge_city": "Halvad",
  "status": "submitted",
  "days_allocated": 31,
  "days_scheduled": 31,
  "days_worked": 9,
  "scheduling_percentage": 100,
  "completion_percentage": 29,
  "cities_allocated": 3,
  "working_days": 24,
  "flags": [/* see §2.8 */],
  "month_strip": [/* one entry per calendar date */],
}
```

`month_strip` covers **every calendar date** of the period, each with a derived
`label`:

| Label         | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `worked`      | Scheduled, and a visit landed on it.                        |
| `planned`     | Scheduled, still ahead (or today) and not yet worked.       |
| `holiday`     | Scheduled with an activity whose `is_working_day` is false. |
| `missed`      | Scheduled, **past**, and nothing was ever recorded.         |
| `unscheduled` | No day row. Normal on a draft or a freshly published plan.  |

Whether `unscheduled` is a problem depends on `status` — read it from the plan,
not from the strip.

### 2.2 Pickers — `GET /journey-plans/allocation-options`

Query: `sales_incharge_id`, `period_month`.

**This is the whitelist the allocation Save enforces**, not a convenience:
anything absent from it is refused with a 400. It needs no plan to exist — the
admin opens it to build the month.

- `total_days` — what the counts must add up to.
- `activities[]` — the activity master filtered to `is_admin_allocatable` and
  `active`.
- `cities[]` — derived from the beats **currently** allocated to the rep, with
  `beat_count`, `outlet_count`, and `last_worked_date`. **`null` = never
  worked**, which the solver weighs heaviest — do not render it as "long ago".

### 2.3 Detail — `GET /journey-plans/:id`

Both allocation sets, each bucket carrying `days_count` **and**
`days_scheduled`; the three day-counts and both percentages;
`allocation_variance`; `can_publish` / `can_approve`; `flags`; `month_strip`;
and `days`.

**`days` is empty on a `draft` and on a freshly `published` plan.** Draw the
calendar from `month_strip`; use `days` for the detail of the dates that exist.

`city_allocations[].beat_count` reads **0** when the rep no longer has beats in
that city — the same thing the `city_without_beats` flag reports.

### 2.4 The allocation Save — `PATCH /journey-plans/:id`

Body: `{ activity_allocations?, city_allocations? }`. Each field is a **full
replacement** of what it covers; an omitted field is untouched. Returns the
saved plan.

It does **not** touch the schedule. Re-allocating under a schedule that no
longer fits is allowed and leaves a `schedule_mismatch` flag that blocks
approval — better than deleting the rep's work. **Refused (409) once the plan is
`approved`**; correct the schedule instead.

### 2.5 The correction pass — `PATCH /journey-plans/:id/schedule`

```jsonc
{
  "days": [
    { "date": "2026-09-03", "activity_id": 1, "city_id": 20, "beat_ids": [10, 11] },
    { "date": "2026-09-06", "activity_id": 12, "beat_ids": [] },
  ],
}
```

A **full replacement** — send every date. Open from `submitted` onward,
**including after approval**, because a live month has to be correctable and the
rep can no longer do it; refused (409) on a `draft` or `published` plan, where
the schedule is his. Correcting an approved plan does **not** reopen the cycle —
the status stays `approved`.

Rows land with `origin: "admin"`, which is how the screen shows where the
approved calendar differs from what the rep handed over. **Locked dates survive
whatever you send**; send them anyway, they are skipped.

Per-day rules — identical to the rep's save, one implementation:

- An activity with `requires_beat` needs a `city_id` **and** at least one beat.
- An activity without it must have **neither**.
- Every beat must be allocated to the rep **and** sit in that day's city. (A
  beat whose own `city_id` is `null` is allowed — that is a gap in the beat
  master, not a scheduling error.)
- **No limit on beats per day**, and `beat_ids` order is the intended order.

### 2.6 The two transitions

`POST /journey-plans/:id/publish` and `POST /journey-plans/:id/approve`. Both
return `{ journey_plan_id, status, days_allocated, days_scheduled }` and are
guarded by **`journey-plan:approve`** — one permission for both ends.

- **publish**: `draft` → `published`. 400 if the allocation does not account for
  the whole month; 409 if not a draft.
- **approve**: `submitted` → `approved`. 400 if the schedule does not consume
  every bucket exactly — the error `details` name the offending buckets; 409 if
  not submitted, or already approved.

### 2.7 Generate — `POST /journey-plans/generate`

Body: `{ period_month, sales_incharge_ids?, activity_allocations[], replace_existing?, seed? }`.

The **activity buckets apply to every rep in the run** — "one monthly meeting,
four weekly offs" is a company fact. The solver then splits each rep's remaining
days across his own cities, weighted by how much work each holds and by how long
it has gone untouched. Every plan lands as a **`draft`**.

Per-rep `outcome`: `created`, `replaced`, `skipped_existing`,
**`skipped_in_progress`** (the plan has left `draft` — regenerating would discard
the rep's schedule), `no_beats`, `failed`. One rep's failure does not fail the
run. 400 if an activity is unknown or not allocatable, or if the activity days
leave no room for field work.

### 2.8 Flags

Computed, never stored, most severe first. Two of them mirror a refusal:

| Code                       | Blocks                    |
| -------------------------- | ------------------------- |
| `no_cities_allocated`      | — (publish will fail too) |
| `allocation_incomplete`    | **publish**               |
| `schedule_unallocated`     | **approve**               |
| `schedule_mismatch`        | **approve**               |
| `city_without_beats`       | —                         |
| `beat_outside_city`        | —                         |
| `activity_not_allocatable` | —                         |
| `awaiting_schedule`        | —                         |

`schedule_mismatch` is deliberately **silent until the rep has scheduled
something** — every bucket of an untouched month is mismatched by its full count,
and forty rows of that is noise, not information.

---

## 3. Sales Incharge app

### Once a month: schedule it

#### `GET /journey/my-plan?period_month=YYYY-MM`

Both allocation sets, with **the beats of each allocated city nested inside it**
— the whole month can be dated without another round trip. Plus `days` (what he
has scheduled), `total_days`, `can_edit`, `can_submit`.

**A `draft` reads as no plan**: `journey_plan_id` and `status` are `null`, the
same answer as when no plan exists. The admin has not released it, and it may
change entirely before he does.

`can_edit` is true **only while `published`** — false from submission onward,
permanently. Approval does not hand it back.

#### `PATCH /journey/my-plan/schedule?period_month=YYYY-MM`

Body: `{ days: [...] }` — the same day shape as §2.5, and the same per-day rules.
A **full replacement**. Does **not** require the counts to balance; returns
`days_written`, `days_held` (locked dates skipped) and `can_submit`. 404 on a
draft, 409 once submitted.

#### `POST /journey/my-plan/submit?period_month=YYYY-MM`

400 unless every bucket is consumed exactly — `details.mismatched` and
`details.unallocated` name which. There is no unsubmit.

### Every morning: open it

There is nothing to pick. He checks in (attendance module, not here), then:

#### `POST /journey/my-day/open` — `{ date }`

Snapshots the day's outlets from its beats and sequences them from his check-in
fix. Returns `{ opened, journey_plan_day_id, stops_created, sequenced }`.

- **`opened: false`** (not a 404) when the approved calendar says nothing about
  that date. He is not making an error by opening the app on a blank day.
- **`sequenced: false`** when he has not checked in — the stops still land, but
  there is no starting point to walk from, so the order is left alone.
- **Idempotent.** `GET /my-day` re-runs it as a self-heal, so a client that
  crashed between checking in and calling it does not end up with an empty day.
- He needs a connection for this one call. Everything after it works offline.

Outlets are snapshotted here rather than pre-synced because beat membership
moves — a shop added on the 9th belongs on the 10th's list.

#### `GET /journey/my-day` and the visit endpoints

Unchanged, except that `beats[].on_allocation` now means **"this beat still sits
in the day's allocated city"**. The scheduler refuses an out-of-city beat, so
`false` means the **beat master has drifted** since approval — his outlet list is
for a town he is not in. `stops[].sequence` remains the "best available" order:
planned once the day has started, advisory before.

---

## 4. Live map

Unchanged except `on_allocation`, which carries the meaning above and is `true`
on a day with no beats at all — a meeting has no city to be off.

End-of-day coordinates (`day_end_latitude` / `day_end_longitude`,
`check_out_latitude` / `check_out_longitude`) are `null` while a session is still
open — a different null from "no attendance for the day", where every `day_*`
field is null.

---

## 5. Known gaps

- **Leave requests** are not built. Leave is an ordinary allocatable activity;
  there is no apply/approve workflow.
- **Absence is derived** (`label: "missed"`), not recorded. There is no
  reason-for-absence field.
- **A beat with no `city_id`** (its primary distributor has none) is unreachable
  by allocation and is silently excluded from the city pickers. Fix it in the
  beat master.
- **Coverage** (visits against each beat's `visits_per_month` cycle) is
  computable now that the beats for a date are agreed in advance, but is not
  reported — nobody has specified the definition.
