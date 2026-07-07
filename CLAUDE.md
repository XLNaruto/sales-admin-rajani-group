# CLAUDE.md — Sales Admin Web Portal

Guidance for Claude Code. Same architecture as the Dispatch Panel — modular features, TanStack Query for server state, Zustand for client state.

## Stack

- **React 19 + Vite + TypeScript** (strict)
- **TanStack Query** — all server state
- **TanStack Router** — file-based routing
- **TanStack Table** — all data tables
- **Zustand** — client/UI state only
- **Tailwind + shadcn/ui** — styling & components
- **Recharts** — sales / target analytics
- **Axios** — HTTP · **Zod** — validation
- **react-hook-form** — forms (onboarding, visit forms, TA/DA)
- Maps: **leaflet + react-leaflet** (GPS)

## First-time setup

```bash
npm create vite@latest sales-admin-portal -- --template react-ts
cd sales-admin-portal
npm install @tanstack/react-query @tanstack/react-router @tanstack/react-table zustand axios zod react-hook-form @hookform/resolvers
npm install -D @tanstack/react-query-devtools @tanstack/router-devtools @tanstack/router-plugin vite-tsconfig-paths
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init          # choose the "@/" alias
npm install recharts date-fns leaflet react-leaflet
# fonts (matches the dispatch design system)
npm install @fontsource/space-grotesk @fontsource/inter @fontsource/jetbrains-mono
```

## Non-negotiable rules

1. **Server state → TanStack Query. Client state → Zustand. Never mix.**
2. **Components never call `fetch`/`axios` directly** — they call a Query/mutation hook from the feature's `api/`.
3. **All query keys live in `src/lib/query-keys.ts`.**
4. **New feature = new folder under `src/features/`** with `api/`, `components/`, `hooks/`, `types/`, `pages/`, `index.ts`.
5. **Cross-feature imports go through the feature's `index.ts`**, never deep paths.
6. **`@/` alias**, never long relative chains.
7. **One generic `<DataTable>`** powers every list screen.
8. **Zustand stores stay small and single-concern**; select narrowly.
9. **External integrations (Field Assist, WhatsApp) and calculations (TA/DA) stay behind a service/hook** — never leak SDKs or calc logic into components.

## Folder structure

```
src/
├── app/            providers, layouts (sidebar/topbar shell)
├── routes/         file-based route tree
├── features/       the modules — each self-contained
├── components/     ui/ (shadcn), data-table/, charts/, maps/, common/
├── lib/            api-client, query-client, query-keys, utils
├── stores/         GLOBAL zustand: auth-store, ui-store
├── hooks/ · types/ · config/ · styles/
```

## The feature modules

| Folder | Nav module(s) | Covers |
|---|---|---|
| `dashboard/` | 1 (Dashboard) | KPI dashboard, daily sales overview (zone/product/primary/secondary), team & beat performance, target vs achievement, attendance summary, AI analytics, daily summary |
| `distributor-management/` | 1 + 4 | Onboarding, approval, category mapping, performance tracking, allocate to sales incharge |
| `employee-management/` | 1 | Leave, expense, task management, pending approvals |
| `communication/` | 1 | Internal comms, **WhatsApp integration** |
| `team-management/` | 2 | Salesman hierarchy, monitoring, performance, productivity, daily activity, sales incharge onboarding |
| `beat-tour/` | 3 | Beat creation/allocation/programs/planning; monthly & day-wise & territory tour planning, route mapping, party mapping, editable + next-day schedules |
| `crm-sales/` | 4 | Sales-manager visit forms, route mgmt, service-center + distance-based allocation, meeting & CRM-controlled scheduling, secondary-sales/retailer/market-visit monitoring |
| `approvals/` | 5 | Central inbox: tour / expense / attendance / leave approvals |
| `gps-tracking/` | 6 | Salesman GPS, route + geo-location monitoring, **fake-location detection** |
| `reports-analytics/` | 7 | Sales, target-achievement, attendance, visit-history, expense, performance reports |
| `retailer-management/` | 8 | Onboarding, distributor mapping, performance, retailer-wise analytics, **Field Assist import** |
| `expense-tada/` | 9 | TA/DA master, effective-date & HQ-based calc, additional expenses |
| `notifications/` | 10 | Push notifications, sales alerts, birthday/anniversary/festival greetings |

### Two intentional consolidations
- **Distributor Management** is listed under both Dashboard (1) and CRM (4) → one `distributor-management/` feature.
- **Approvals**: the `approvals/` feature is the central inbox; individual approve/reject **mutations** live with their source domain (leave in `employee-management/api/`, tour in `beat-tour/api/`, etc.) and the inbox composes them.

## Domain specifics

- **Field Assist import** → `retailer-management/api/`: import service + `useImportRetailers`, Zod-validate rows.
- **WhatsApp** → `communication/api/`: wrap provider in one service; expose `useSendWhatsAppMessage`.
- **GPS / fake-location** → `gps-tracking/`: live via Query `refetchInterval` or WebSocket → `setQueryData`; fake-location check is a **pure function** in the feature `lib/`.
- **TA/DA** → `expense-tada/`: effective-date + HQ-based rules are **pure functions** (input → amount), UnitTest-able, separate from UI/API.
- **Wizards** (distributor / retailer / incharge onboarding): step state in a feature-local Zustand slice; submit via one mutation.

## Conventions

- Files kebab-case; Components PascalCase; hooks `useX`; stores `useXStore`.
- Query hooks in `features/<name>/api/`: `use<Thing>` (queries), `use<Action>` (mutations).
- Forms: react-hook-form + Zod resolver, inline field errors.
- Env only through `config/env.ts` (zod-parsed).

## Scripts

```bash
npm run dev · npm run build · npm run preview · npm run lint
```

## Before finishing any task
- `npm run build` passes (no TS errors).
- No server data in Zustand; no direct `fetch`/axios in components.
- New API calls went through a feature `api/` hook + centralized query key.
- External integrations and TA/DA calc stayed behind their service/pure-function boundary.
