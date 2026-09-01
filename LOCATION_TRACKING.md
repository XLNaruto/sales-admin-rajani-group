# Sales Admin — Location Tracking (frontend spec)

Implementation brief for the **Sales Admin web panel**. Two new screens backed by two new
read-only endpoints. Everything below is verified against the shipped API — schemas, field names
and error codes are exact.

Base URL for this panel: **`/sales-incharge-admin`**
Live Swagger (source of truth, browse it): **`/sales-incharge-admin/docs`**

---

## 1. What these screens are

The sales-incharge mobile app posts a GPS ping every so often. Those pings form an append-only
breadcrumb ledger. These two screens are the admin's read of it:

| Screen | Endpoint | What it answers |
| --- | --- | --- |
| **Live Fleet Map** | `GET /locations/live` | "Where is my whole team right now?" |
| **Rep Day Trail** | `GET /locations/trail` | "Where exactly did this rep go on this day?" |

### The one thing to get right

There is an **existing** "Live Map" screen on this panel (`GET /live-day/summaries` +
`GET /live-day/detail`, permission `live-day:read`). It is a **different feature** and must stay
where it is.

- **Live Day** = plan vs. actual. What the rep *reported doing* — visits, counters, productivity.
  Its `route` field is a **reconstruction**: the shortest walk through the shops he logged.
- **Location Tracking** (this brief) = where the handset physically **was**, minute by minute.

They will disagree, and that is expected. Do not merge the screens, do not reuse the permission,
and do not present the trail as a correction to Live Day's route. If you show both on one map,
label them distinctly ("Visit route (derived)" vs "GPS trail (recorded)").

---

## 2. Auth, tenancy, permissions

### Auth
Standard for this panel — nothing new.

- `POST /sales-incharge-admin/auth/password-login` with `{ username, password }` →
  `{ access_token, refresh_token, expires_in }`
- Send `Authorization: Bearer <access_token>` on every call below.
- `401` → token missing/expired. Run your existing refresh-then-retry, then bounce to login.

### Company scoping — REQUIRED
Both endpoints are tenant-scoped and **fail without a selected company**.

- `GET /me/companies` → `{ companies: [{id, name}], selected_company_id, requires_selection }`
- `POST /me/company/select` with `{ "company_id": 7 }`

If a request returns **`403` with `error: "COMPANY_NOT_SELECTED"`**, do not show a permission
error — open the company picker. This is a distinct case from a real permission denial and users
will be confused if you conflate them.

### Permission — `sales-incharge-location:read`

Fetch the current user's codes from `GET /sales-incharge-admin/permissions` → `{ items: string[] }`.

```ts
const canSeeLocationTracking = permissions.includes("sales-incharge-location:read");
```

- **Show the "Location Tracking" sidebar entry only when that code is present.**
- This panel's general rule is that `:list` drives the sidebar. This feature is an exception and
  follows the **`live-day:read` precedent**: a `:read` code is the menu grant. There is no
  `sales-incharge-location:list`. Do not look for one.
- One code covers **both** screens. There is no separate grant for the trail.
- It is granted per-role via the role builder under the group **`sales-incharge-location`**,
  labelled **"Location Tracking"**, single action **"View"**. It is *not* a baseline grant, so
  plenty of users will not have it.
- A user can hold `live-day:read` without this one, and vice versa. Gate the two menus
  independently.

`403` with any other error code = genuinely lacks the permission. Render an access-denied state,
not a retry.

---

## 3. Screen A — Live Fleet Map

### `GET /sales-incharge-admin/locations/live`

Every rep in the selected company, each with their most recent fix on a given day.

#### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | `1` | |
| `page_size` | int 1–100 | `20` | |
| `tracked_date` | `YYYY-MM-DD` | today (IST) | The day to read positions for |
| `search` | string 1–200 | — | Matches rep display name **or** phone, case-insensitive |
| `status` | `active` \| `invited` \| `suspended` \| `inactive` | — | Rep account status |
| `beat_id` | int > 0 | — | Keeps reps whose **latest fix** was tagged with this beat |
| `only_stale` | bool | — | Accepts `true`/`false`/`1`/`0` only |
| `only_fake` | bool | — | Same |
| `sort_by` | `display_name` \| `employee_code` \| `status` | — | Omit for newest-rep-first |
| `sort_order` | `asc` \| `desc` | `desc` | |

> **Booleans are strict.** Send the literal string `true`/`false`/`1`/`0`. Any other value is a
> `400`, deliberately. Omit the param entirely rather than sending `""`, `null` or `undefined`.

#### Response

```jsonc
{
  "sales_incharge_locations": [
    {
      "sales_incharge_id": 2,
      "sales_incharge_name": "Ramesh Patel",
      "employee_code": "EMP2",          // nullable
      "status": "active",
      "latitude": "21.524167",          // nullable — STRING, see §5
      "longitude": "70.438434",         // nullable
      "beat_id": 11,                    // nullable
      "beat_name": "Rajkot East",       // nullable (also null if the beat was deleted)
      "is_fake_location": false,
      "recorded_at": "2026-08-27T09:59:00.000Z",  // nullable, ISO-8601
      "last_seen_minutes_ago": 1,       // nullable, integer, FLOORED
      "is_stale": false
    }
  ],
  "total": 41,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

Note the array key is **`sales_incharge_locations`**, not `items`.

#### Three behaviours that will bite you if you miss them

**1. A rep who has not reported is still a row.**
Every coordinate field comes back `null`, `last_seen_minutes_ago` is `null`, and `is_stale` is
`true`. This is the single most important thing the screen says — *"nobody has heard from Ramesh
today"* — so **never filter these rows out client-side**. Render them in the list with a "No
signal today" treatment, and simply place no marker on the map.

**2. `total` counts REPS, not fixes.**
The denominator is the whole team. `total` will exceed the number of markers you can draw, and
that is correct — don't "fix" it.

**3. `beat_id`, `only_stale` and `only_fake` narrow the PAGE, not the total.**
These three filter on properties of the latest fix, which the server applies *after* paginating
the rep list. So `sales_incharge_locations.length` can be smaller than `page_size` while
`total_pages` still says there are more pages. Consequences:

- Do **not** compute "showing X of Y" from the array length.
- Do **not** stop paginating because a page came back short or empty — a later page may have
  matches.
- Best UX: when any of these three is active, show a plain "N matching on this page" count and
  keep normal pagination. Do not present a filtered total you cannot compute.

#### Rendering

- `is_stale` is **true when the latest fix is older than 15 minutes**, and always true when there
  is no fix at all. Treat it as a display hint, not an accusation — a rep in a signal dead zone
  trips it too. Suggested marker states: fresh / stale (muted or hollow) / no-signal (list only).
- `last_seen_minutes_ago` is **floored** — a 90-second-old fix reads `1`. Render it as
  "~1 min ago" or "at least 1 min ago". Don't imply precision the number does not carry.
- `is_fake_location` is the **handset's own** mock-location report, stored as sent. Flag it
  visibly (it is the reason the field exists) but word it as *reported*, e.g. "Mock location
  reported by device" — not "Fraud".
- The value is time-sensitive: **poll on an interval** (30–60s is sensible) while the tab is
  visible, and pause when hidden. Recompute nothing client-side —
  `last_seen_minutes_ago` is stamped server-side per response, so a stale response shows stale
  numbers until the next poll. Show a "last refreshed" timestamp.

> **There is no WebSocket for this yet.** The realtime service cannot currently fan location
> pings out to the admin namespace. Poll. Do not build against a socket event.

---

## 4. Screen B — Rep Day Trail

### `GET /sales-incharge-admin/locations/trail`

#### Query parameters

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `sales_incharge_id` | int > 0 | **yes** | |
| `tracked_date` | `YYYY-MM-DD` | **yes** | No default — you must pass a day |

#### Response

```jsonc
{
  "sales_incharge_id": 2,
  "sales_incharge_name": "Ramesh Patel",
  "tracked_date": "2026-08-27",
  "points": [
    {
      "id": 101,
      "latitude": "21.524167",
      "longitude": "70.438434",
      "beat_id": 11,                  // nullable
      "beat_name": "Rajkot East",     // nullable
      "is_fake_location": false,
      "recorded_at": "2026-08-27T09:00:00.000Z"
    }
  ],
  "total_points": 3,
  "distance_metres": 3121.44,
  "mock_suspected_count": 0,
  "first_seen_at": "2026-08-27T09:00:00.000Z",  // nullable
  "last_seen_at": "2026-08-27T09:45:00.000Z"    // nullable
}
```

#### Notes

- **`points` is already oldest-first** — the order you draw the polyline in. Do not re-sort.
- **Not paginated, by design.** The whole day comes back; a half-drawn route is a wrong map.
  Volume is bounded server-side (roughly one point per minute for a stationary rep), so a day is
  typically low hundreds of points. Still, simplify the polyline for rendering if you hit
  performance limits — but keep every point available for the timeline/inspection view.
- **An empty day is a `200`, not a `404`.** `points: []`, `total_points: 0`,
  `distance_metres: 0`, both timestamps `null`. Render "No positions recorded on this date" —
  this is not an error state.
- `distance_metres` is the summed straight-line hops between consecutive fixes. It is **not road
  distance**: it under-reports corners taken between samples and over-reports slightly from GPS
  jitter. Label it **"Approx. distance travelled"**. It is `0` for a trail of fewer than two
  points — one fix is a place, not a journey.
- `mock_suspected_count` counts points carrying the device's mock-location flag. If it is > 0,
  surface a day-level warning and mark those individual points on the map.
- Points with `beat_id: null` are normal — travelling, or outside any beat. Not an error.

#### Errors

| Status | Code | Meaning / what to render |
| --- | --- | --- |
| `401` | — | Refresh, then retry; else login |
| `403` | `COMPANY_NOT_SELECTED` | Open the company picker |
| `403` | *(other)* | Access denied — lacks `sales-incharge-location:read` |
| `404` | `SALES_INCHARGE_NOT_FOUND` | "Sales incharge not found" |

> A rep who exists but belongs to **another company** returns the same `404`, deliberately, so the
> id cannot be probed. Do not write copy that distinguishes "not found" from "not yours".

All error bodies are `{ error, message, details? }`. Prefer `error` (the machine code) for
branching; `message` is human-readable and safe to display.

---

## 5. Cross-cutting gotchas

**Coordinates are STRINGS, not numbers.**
`"21.524167"`, not `21.524167`. The column is `numeric(9,6)` and they travel as strings so no
precision is lost in JSON. Your map SDK needs numbers, so `Number(lat)` at the render boundary —
but **keep the string** for display, equality checks and anything you send back. Do not round-trip
through a float and re-serialise.

**Dates: `tracked_date` is an IST calendar day, not an instant.**
Format it yourself as `YYYY-MM-DD` from the user's picked date. Do **not** derive it with
`toISOString().slice(0,10)` — that converts to UTC first and will hand back the previous day for
users east of UTC, which is everyone on this platform. Use local getters or a date library in
`Asia/Kolkata`.

**`recorded_at` / `first_seen_at` / `last_seen_at` ARE instants** — full ISO-8601 UTC. Parse and
render in the user's local zone (effectively IST). Note the asymmetry: one field on the object is
a calendar day, the others are timestamps.

**Pagination envelope** matches every other list on this panel: `page` / `page_size` in, and
`{ <resource_key>[], total, page, page_size, total_pages }` out. There is no `limit`/`offset` at
the HTTP surface.

---

## 6. Suggested build order

1. Sidebar entry gated on `sales-incharge-location:read`, plus route scaffolding.
2. Typed API client for both endpoints + the shared error-code handling from §4.
3. Fleet map: table/list first (easier to verify the null-fix rows), then the map layer.
4. Filters, then polling + "last refreshed".
5. Trail screen, reached by clicking a rep on the fleet map (carry the currently-selected
   `tracked_date` through) and from the rep's detail page.
6. Trail timeline / point inspector, mock-location flagging.

### Definition of done

- [ ] Menu hidden entirely without the permission; visible with it.
- [ ] `COMPANY_NOT_SELECTED` opens the picker rather than showing an error.
- [ ] Reps with no fix appear in the list with a "no signal" state and no map marker.
- [ ] A short/empty page under `only_stale` / `only_fake` / `beat_id` does **not** break
      pagination or the count display.
- [ ] Trail polyline renders in the returned order; empty day shows an empty state, not an error.
- [ ] Distance is labelled approximate; mock-location is worded as device-*reported*.
- [ ] No `toISOString().slice(0,10)` anywhere near `tracked_date`.
- [ ] Coordinates never stored as floats in app state.

---

## 7. Out of scope (do not build)

- **Realtime/WebSocket location push.** Not available on the admin namespace yet; poll instead.
- **Any write to the location ledger.** It is append-only and written solely by the mobile app.
  There is no create, update or delete on this surface.
- **Changing the existing Live Day screens.** Their `route` stays a reconstruction.
