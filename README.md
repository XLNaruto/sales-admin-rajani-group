# Rajani Group — Sales Admin Web Portal

React 19 + Vite + TypeScript admin portal built to the architecture in
[`CLAUDE.md`](./CLAUDE.md) / `SALES-ARCHITECTURE.md`. Modular, feature-based, with
TanStack Query for server state and Zustand for client state.

## Stack

- **React 19 + Vite + TypeScript** (strict)
- **TanStack** — Query (server state), Router (file-based routes), Table (`<DataTable>`)
- **Zustand** — auth + UI (client state only)
- **Tailwind v4 + shadcn-style UI** — design tokens shared with the Dispatch Panel
- **Recharts** — sales / target analytics · **Leaflet** — GPS tracking
- **Axios** + **Zod** + **react-hook-form**

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview
```

> The app ships with an **in-memory mock API** (`VITE_USE_MOCK_API=true`, see
> `src/config/env.ts`). Every feature `api/` hook resolves fixture data through
> `mockDelay()`, so the whole portal runs with no backend. Swap each hook's
> `queryFn` for an `apiClient` call when the API is ready — nothing else changes.

## Architecture rules (enforced)

1. Server state → TanStack Query · Client state → Zustand · never mixed.
2. Components never call `fetch`/`axios` — only a Query/mutation hook from the feature's `api/`.
3. All query keys live in [`src/lib/query-keys.ts`](./src/lib/query-keys.ts).
4. Each feature is a self-contained folder under `src/features/` with
   `api/ · components/ · lib/ · pages/ · types/ · index.ts`.
5. Cross-feature imports go through the feature `index.ts` barrel (e.g. the
   Approvals inbox composes `useApproveLeave` / `useApproveTour` from their source domains).
6. `@/` path alias · one generic `<DataTable>` for every list screen.

## Feature modules (10-module nav)

| Route | Feature folder | Covers |
|---|---|---|
| `/dashboard` | `dashboard/` | KPIs, primary/secondary sales, zone split, target vs achievement, AI analytics |
| `/distributors` | `distributor-management/` | onboarding, approval, category, performance, allocation |
| `/employees` | `employee-management/` | leave, expense, task management |
| `/communication` | `communication/` | internal comms + **WhatsApp** (service-wrapped) |
| `/team` | `team-management/` | hierarchy, productivity, incharge onboarding |
| `/beat-tour` | `beat-tour/` | beats, tour planning, route/party mapping |
| `/crm` | `crm-sales/` | visit forms, meetings, market-visit monitoring |
| `/approvals` | `approvals/` | central inbox composing tour/expense/attendance/leave |
| `/gps` | `gps-tracking/` | live GPS map + **fake-location detection** (pure fn in `lib/`) |
| `/reports` | `reports-analytics/` | sales/target/attendance/visit/expense/performance + CSV export |
| `/retailers` | `retailer-management/` | onboarding, analytics + **Field Assist import** (Zod-validated) |
| `/expense-tada` | `expense-tada/` | TA/DA master, effective-date calc (pure fns in `lib/`) |
| `/notifications` | `notifications/` | push, sales alerts, greetings |

## Domain integration boundaries

- **WhatsApp** → `communication/api/whatsapp-service.ts` (SDK wrapped once; `useSendWhatsAppMessage`).
- **Field Assist import** → `retailer-management/api/field-assist-service.ts` + `useImportRetailers` (Zod row validation).
- **Fake-location** → `gps-tracking/lib/fake-location.ts` — pure `detectFakeLocation()` (haversine + speed/mock-provider heuristics).
- **TA/DA calc** → `expense-tada/lib/tada-calc.ts` — pure `resolveRate()` / `calculateTada()`.

## Note on file-based routing

TanStack Router generates `src/routeTree.gen.ts` on `dev`/`build`. It is committed so
`tsc -b` (which runs before `vite build`) can resolve it on a fresh checkout.
