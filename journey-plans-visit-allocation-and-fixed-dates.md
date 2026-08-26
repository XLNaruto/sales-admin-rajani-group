# Journey Plans — two API changes for the frontend

Backend changes to journey planning, ready to build against. Two independent
features, both landing in the same endpoints:

1. **Distributor Visit names its distributors** — a `distributor_visit` allocation
   must say _who_ the rep is to call on, and a scheduled visit date says which of
   them that date takes in.
2. **The admin can fix dates** — an activity allocation may pin some of its days
   to specific calendar dates, which go straight onto the schedule and the sales
   incharge cannot move or remove them.

Everything below is additive to existing payloads. Nothing was renamed or removed.
The only behavioural change to an existing field is documented in
[§6 `days_written` / `entries_written`](#6-changed-meaning-days_written--entries_written).

Base paths: admin panel `/sales-incharge-admin`, mobile app `/sales-incharge`.
All wire fields are `snake_case`. Dates are `YYYY-MM-DD` strings.

---

## Background: the three things an allocation is made of

Worth internalising before the field lists, because both features hang off the
distinction.

The admin's allocation screen saves **two lists** in one call:

| List                      | Means                                        | Unit                |
| ------------------------- | -------------------------------------------- | ------------------- |
| `distributor_allocations` | "six days of field selling on Distributor A" | a distributor       |
| `activity_allocations`    | "one meeting day; two search days in Rajkot" | an activity (+city) |

An **activity bucket's identity is `(activity_id, city_id)`** — the same activity
in two cities is two buckets, and the API will fold duplicates of one pair into
one (summing `days_count`, unioning `distributor_ids` and `dates`).

A **distributor visit is an activity bucket, not a distributor bucket.** A visit
takes no beat and covers no outlet — it is an office call. Do not put it in
`distributor_allocations`; the API refuses activities that require a beat there,
and vice versa.

---

## 1. New activity-master flag: `requires_distributors`

`GET /sales-incharge-admin/journey-plans/allocation-options`

Each entry in `activities[]` gains one field:

```ts
activities: Array<{
  activity_id: number;
  code: string; // e.g. "meeting", "distributor_visit"
  name: string;
  is_working_day: boolean;
  requires_distributors: boolean; // NEW
}>;
```

`requires_distributors: true` means **the form must make the admin pick at least
one distributor for this bucket**. Today that is `distributor_visit` and nothing
else, but _do not branch on `code`_ — the flag is data and the client will be able
to change it per activity. Branch on the flag.

The picker's options are the `distributors[]` array the same response already
returns (derived from the beats allocated to that rep). This is a **whitelist**,
not a convenience: Save refuses anything outside it.

---

## 2. Admin allocation Save — two new fields

`PATCH /sales-incharge-admin/journey-plans/:id`

```ts
// Request body — both top-level fields are FULL REPLACEMENTS of what they cover.
// An omitted top-level field is left untouched.
{
  activity_allocations?: Array<{
    activity_id: number;
    city_id?: number | null;      // optional WHERE, e.g. "search in Rajkot"
    distributor_ids?: number[];   // NEW — default [], max 60
    dates?: string[];             // NEW — default [], max 62, "YYYY-MM-DD"
    days_count: number;           // 1..62
  }>;                             // max 60 buckets
  distributor_allocations?: Array<{
    distributor_id: number;
    days_count: number;           // 1..62
  }>;                             // max 60 buckets
}
```

Returns the full `JourneyPlanDetailResponse` (§4), so the screen can render
straight from the response instead of re-fetching.

### `distributor_ids` — who a visit calls on

- **Required and non-empty** when the bucket's activity has
  `requires_distributors: true`.
- **Refused (non-empty) on every other activity** — including a distributor
  _search_, which by definition has no distributor yet.
- Each id must be one of `allocation-options.distributors[]`.
- It is a **set** — order is not stored. The order a given date calls on them in
  is set on the schedule, not here.
- One bucket, one promise: `{ days_count: 3, distributor_ids: [A, B, C] }` means
  "three visit days covering A, B and C", _not_ three separate allocations.

### `dates` — days the admin fixes

- **Optional.** Empty on most buckets.
- Each date materialises immediately into the rep's calendar as an entry he
  **cannot move or remove**.
- `dates.length` must be `<= days_count`. The difference is how many of the
  bucket's days the rep still gets to place himself:
  `{ days_count: 4, dates: ["2026-08-02"] }` = "four weekly offs, one of which is
  the 2nd; you pick the other three".
- Every date must fall inside the plan's period and must not be a date a visit has
  already landed on.
- It is a **set** — order carries nothing, repeats are folded.
- **Full replacement.** Resending a bucket without a date it previously fixed
  _releases_ that day back to the rep. There is no separate unpin call.
- On a **visit** bucket, each fixed date calls on the bucket's **whole**
  `distributor_ids` list. There is no per-date subset. To send him to A on the 8th
  and B on the 19th, leave the dates unpinned and let him place them.

### UI notes

- The two new fields live on the **same Save button** as everything else — there
  is no separate endpoint for either.
- A bucket row therefore has up to four inputs: activity, optional city, optional
  distributor multi-select (shown only when `requires_distributors`), optional
  date multi-select, and the day count.
- The date picker should be constrained to the plan's period, and should exclude
  dates already locked (see `days[].locked` in §4) — the API refuses them anyway,
  but a disabled date is better than a 400.
- Save is refused entirely once the plan is `approved` (409). Correct the schedule
  instead.

---

## 3. Admin schedule Save — one new field

`PATCH /sales-incharge-admin/journey-plans/:id/schedule`

```ts
{
  days: Array<{
    // max 62
    date: string; // "YYYY-MM-DD"
    entries: Array<{
      // 1..10 per date
      activity_id: number;
      distributor_id?: number | null;
      city_id?: number | null;
      beat_ids?: number[]; // max 40
      distributor_ids?: number[]; // NEW — default [], max 40
      joint_working_sales_incharge_id?: number | null;
      reason?: string | null;
    }>;
  }>;
}
```

`distributor_ids` on an **entry** = who that date calls on, **in intended order**
(unlike the allocation's set, this order _is_ stored and returned).

- Required and non-empty on a visit entry (`requires_distributors` activity).
- Refused on every other activity.
- Each must be a distributor the rep holds a beat for — but **not** necessarily one
  the admin allocated. The dates the admin did not spend are the rep's, and a visit
  he adds himself is ordinary.
- `distributor_id` (singular) stays `null` on a visit entry. It is a different
  thing: it names the _distributor bucket a field day is charged to_. A visit
  spends the **activity** bucket. Do not populate it for a visit.

Same field, same rules, on the rep's `PATCH /sales-incharge/my-plan/schedule`.

---

## 4. Reads — what comes back

### Shared shape

```ts
type VisitDistributor = {
  distributor_id: number;
  distributor_name: string | null;
  city_id: number | null;
  city_name: string | null;
};
```

Names can be `null` — that is the honest answer when the distributor has left the
rep's beat allocation since the month was drafted. Render the id or a placeholder;
do not assume a name.

### `GET /sales-incharge-admin/journey-plans/:id`

`activity_allocations[]` gains:

```ts
{
  // ...existing: activity_id, activity_code, activity_name,
  //              city_id, city_name, days_count, days_scheduled
  distributors: VisitDistributor[];  // NEW — non-empty only on a visit bucket
  dates: string[];                   // NEW — "YYYY-MM-DD", ascending
}
```

`days[].activities[]` gains:

```ts
{
  // ...existing: id, sequence, activity_id, activity_code, activity_name,
  //              distributor_id, distributor_name, city_id, city_name,
  //              beats[], joint_working_*, reason
  pinned: boolean;                   // NEW
  distributors: VisitDistributor[];  // NEW — who this date calls on, in order
}
```

Both lists come back **stably ordered** (`distributors` ascending by id on an
allocation, `dates` ascending) so a dirty-check by deep-compare works.

### `GET /sales-incharge/my-plan` (mobile)

- `activity_allocations[]` gains `distributors: VisitDistributor[]` and
  `dates: string[]`.
- `days[].activities[]` gains `distributor_ids: number[]` (ids only, in order) and
  `pinned: boolean`.

### `GET /sales-incharge/my-day` (mobile)

Gains one top-level field:

```ts
visit_distributors: VisitDistributor[];  // NEW
```

Who the rep is to call on **today**, flattened across every distributor-visit entry
on the date, in intended order. Empty on a date with no visit.

These are **office calls, not retailer stops**. They are _not_ in `stops[]`, they
have no check-in flow, and they do not depend on `day_started`. Render them as their
own short list — the rep otherwise has no way to see who he was sent to.

---

## 5. Pinned entries — the rules the UI must respect

A pinned entry is one the admin fixed to a date via an allocation's `dates`.

**The pin is per entry, not per date.** A fixed afternoon meeting does not cost the
rep his morning of retailing. So a date can hold a pinned entry _and_ the rep's own
entries side by side.

**Pinned entries hold the lowest `sequence` values on their date** (1..p), and the
rep's own work follows.

### Admin panel

- Render `pinned: true` entries with a distinct marker ("fixed by you").
- They are **not editable from the schedule screen.** To move or remove one, edit
  the owning activity bucket's `dates` on the allocation screen.
- `PATCH .../:id/schedule` preserves pinned entries whether or not you send them.
  Do **not** include them in the `entries` array you send — see the refusal below.

### Mobile app

- Render `pinned: true` entries **read-only**. No drag, no delete, no beat picker.
- **Do not send them back** in `PATCH /sales-incharge/my-plan/schedule`. Sending a
  pinned activity on its own date is a **400 `JOURNEY_PLAN_ENTRY_PINNED`**.
- The rep _may_ still:
  - add his own entries to a pinned date (they land after the pin);
  - put the **same activity** on a **different** date (the pin fixes one date, not
    the activity everywhere).
- A schedule Save is a full replacement, but a pinned date the rep never mentions
  **survives** it. He cannot drop a fixed date by omitting it.

### Deriving the rep's remaining freedom

For an activity bucket: `days_count - dates.length` = days of this activity he
still gets to place. Useful for a "2 of 4 placed by admin" hint.

---

## 6. Changed meaning: `days_written` / `entries_written`

Returned by both schedule-save endpoints. **The values changed meaning** — check
any UI copy built on them.

| Field             | Now means                                                                    |
| ----------------- | ---------------------------------------------------------------------------- |
| `days_written`    | Dates **this call** put down — the ones it asked for and was allowed to have |
| `entries_written` | Entries **this call** put down, **excluding** pinned entries on those dates  |
| `days_held`       | Unchanged — locked dates on the plan the write was not allowed to rewrite    |

Previously these counted everything the plan ended up with, which would now
attribute the admin's pins to the rep. If you show "3 days saved", it now reflects
only what the user actually did.

---

## 7. Error codes

All errors use the standard envelope:

```ts
{ error: string; message: string; details?: unknown }
```

Match on `error`, show `message`, and use `details` to highlight the offending row.

### `PATCH /sales-incharge-admin/journey-plans/:id` — 400

| `error`                                          | Cause                                                            | `details`                                 |
| ------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| `JOURNEY_PLAN_ACTIVITY_DISTRIBUTORS_REQUIRED`    | A `requires_distributors` bucket sent an empty `distributor_ids` | `activity_id`, `code`                     |
| `JOURNEY_PLAN_ACTIVITY_DISTRIBUTORS_NOT_ALLOWED` | `distributor_ids` on an activity that does not take them         | `activity_id`, `code`                     |
| `JOURNEY_PLAN_DISTRIBUTOR_NOT_REACHABLE`         | A distributor the rep holds no beat for (visit target or bucket) | `distributor_ids`                         |
| `JOURNEY_PLAN_FIXED_DATES_EXCEED_COUNT`          | `dates.length > days_count`                                      | `activity_id`, `days_count`, `date_count` |
| `JOURNEY_PLAN_DATE_OUT_OF_PERIOD`                | A fixed date outside the plan's month                            | `date`, `period_month`                    |
| `JOURNEY_PLAN_DAY_LOCKED`                        | Fixing a date a visit has already landed on                      | `date`, `activity_id`                     |
| `JOURNEY_PLAN_DUPLICATE_FIXED_DATE`              | Two buckets fixing the same date for the same activity           | `date`, `activity_id`, `code`             |
| `ACTIVITY_NOT_ALLOCATABLE`                       | Existing — not admin-allocatable, or requires a beat             | `activity_id`, `code`                     |
| `CITY_NOT_FOUND`                                 | Existing — `city_id` not in the master                           | `city_id`                                 |

Also `404 JOURNEY_PLAN_NOT_FOUND` and `409 JOURNEY_PLAN_ALREADY_APPROVED`.

### Both schedule-save endpoints — 400

| `error`                                       | Cause                                                    | `details`                 |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| `JOURNEY_PLAN_VISIT_DISTRIBUTORS_REQUIRED`    | A visit entry naming nobody                              | `date`, `activity_code`   |
| `JOURNEY_PLAN_VISIT_DISTRIBUTORS_NOT_ALLOWED` | `distributor_ids` on an activity that does not take them | `date`, `activity_code`   |
| `JOURNEY_PLAN_DISTRIBUTOR_NOT_REACHABLE`      | A visit target the rep holds no beat for                 | `date`, `distributor_ids` |
| `JOURNEY_PLAN_ENTRY_PINNED`                   | Sent an entry for work the admin pinned to that date     | `date`, `activity_code`   |

Existing schedule refusals are unchanged (`JOURNEY_PLAN_DATE_OUT_OF_PERIOD`,
`JOURNEY_PLAN_DUPLICATE_DATE`, `JOURNEY_PLAN_DAY_EMPTY`,
`JOURNEY_PLAN_DISTRIBUTOR_REQUIRED`, `JOURNEY_PLAN_BEAT_REQUIRED`,
`JOURNEY_PLAN_DISTRIBUTOR_NOT_ALLOWED`, `JOURNEY_PLAN_BEATS_NOT_ALLOWED`,
`JOURNEY_PLAN_BEAT_NOT_ALLOCATED`, `JOURNEY_PLAN_BEAT_OUTSIDE_DISTRIBUTOR`,
`JOURNEY_PLAN_DUPLICATE_ENTRY`, `ACTIVITY_NOT_FOUND`).

---

## 8. Worked examples

### Allocate a visit to two distributors, one date fixed

```http
PATCH /sales-incharge-admin/journey-plans/41
```

```json
{
  "activity_allocations": [
    {
      "activity_id": 4,
      "distributor_ids": [12, 19],
      "dates": ["2026-08-08"],
      "days_count": 2
    },
    {
      "activity_id": 8,
      "distributor_ids": [],
      "dates": ["2026-08-14"],
      "days_count": 1
    }
  ]
}
```

Result: the 8th and the 14th are now on the rep's calendar as pinned entries. The
8th's visit calls on both 12 and 19. The visit bucket's second day is unfixed — the
rep places it.

### The same call, read back

```json
{
  "activity_allocations": [
    {
      "activity_id": 4,
      "activity_code": "distributor_visit",
      "activity_name": "Distributor Visit",
      "city_id": null,
      "city_name": null,
      "distributors": [
        {
          "distributor_id": 12,
          "distributor_name": "Halvad Traders",
          "city_id": 3,
          "city_name": "Halvad"
        },
        {
          "distributor_id": 19,
          "distributor_name": "Morbi Agencies",
          "city_id": 5,
          "city_name": "Morbi"
        }
      ],
      "dates": ["2026-08-08"],
      "days_count": 2,
      "days_scheduled": 1
    }
  ],
  "days": [
    {
      "date": "2026-08-08",
      "origin": "admin",
      "locked": false,
      "activities": [
        {
          "id": 900,
          "sequence": 1,
          "pinned": true,
          "activity_id": 4,
          "activity_code": "distributor_visit",
          "distributor_id": null,
          "distributors": [
            {
              "distributor_id": 12,
              "distributor_name": "Halvad Traders",
              "city_id": 3,
              "city_name": "Halvad"
            },
            {
              "distributor_id": 19,
              "distributor_name": "Morbi Agencies",
              "city_id": 5,
              "city_name": "Morbi"
            }
          ],
          "beats": []
        }
      ]
    }
  ]
}
```

### The rep adds his own morning to a fixed date

```http
PATCH /sales-incharge/my-plan/schedule
```

```json
{
  "days": [
    {
      "date": "2026-08-08",
      "entries": [
        { "activity_id": 1, "distributor_id": 12, "beat_ids": [10, 11], "distributor_ids": [] }
      ]
    }
  ]
}
```

Note the pinned visit is **not** in the array. The 8th comes back with two entries:
the pin at `sequence: 1` and his retailing at `sequence: 2`. Response reports
`days_written: 1`, `entries_written: 1`.

### The rep schedules his own visit day

```json
{
  "days": [
    {
      "date": "2026-08-19",
      "entries": [{ "activity_id": 4, "beat_ids": [], "distributor_ids": [19] }]
    }
  ]
}
```

One distributor out of the bucket's two, on a date he chose. Accepted — the bucket
had a second unfixed day, and even if it hadn't, an extra visit on a spare date is
his to add.

---

## 9. Build checklist

**Admin panel**

- [ ] `allocation-options`: read `requires_distributors` per activity.
- [ ] Allocation bucket row: distributor multi-select, shown iff
      `requires_distributors`, options from `distributors[]`, required non-empty.
- [ ] Allocation bucket row: optional date multi-select, bounded by the plan
      period, disabled on locked dates, capped at `days_count`.
- [ ] Render `dates` and `distributors` back from the detail response; deep-compare
      for the dirty check (both are stably ordered).
- [ ] Schedule screen: `pinned` entries marked and non-editable; never sent in the
      schedule body.
- [ ] Schedule entry editor: `distributor_ids` multi-select for visit activities;
      leave `distributor_id` null there.
- [ ] Map the new 400 codes to field-level errors.

**Mobile app**

- [ ] `my-plan`: show each activity bucket's `distributors` and `dates`; derive
      "N of M days already fixed".
- [ ] `my-plan`: `pinned` entries read-only, excluded from the schedule payload.
- [ ] Schedule editor: `distributor_ids` picker for visit entries, ordered.
- [ ] `my-day`: render `visit_distributors` as its own list, separate from `stops`.
- [ ] Handle `JOURNEY_PLAN_ENTRY_PINNED` by refreshing the plan — it means the
      local copy is stale.
- [ ] Re-check any copy driven by `days_written` / `entries_written`.

---

## 10. Things that did **not** change

- No new endpoints. No renamed or removed fields.
- The allocation is still **partial by design** — it does not have to fill the
  month, over-allocation is a flag not a refusal, and nothing gates a transition on
  the counts.
- Beats are still **never** the admin's to pick. Fixed dates are the one exception
  to "the admin allocates, the rep dates"; there is no exception for beats.
- Locked dates (a visit has landed) are still untouchable by everyone.
- `distributor_allocations` is unchanged.
