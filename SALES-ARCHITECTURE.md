# Sales Admin Web Portal — Architecture

**Stack:** React 19 + Vite + TypeScript · TanStack (Query · Router · Table) · Zustand · Tailwind + shadcn/ui

> Same architecture as the Dispatch Panel. Only the feature modules and domain differ. If you already built the dispatch panel, this is the identical shell — reuse the design system, `<DataTable>`, theme provider, and auth module as-is.

---

## Core principle: separate server state from client state

- **Server state** (distributors, salesmen, beats, tours, retailers, sales figures, GPS pings, approvals, reports) → **TanStack Query**.
- **Client state** (auth session, sidebar, active filters, selected salesman on the map, theme, wizard steps) → **Zustand**.

Never copy Query data into Zustand. This is the rule the whole structure depends on.

---

## Folder structure (feature-based / modular)

```
sales-admin-portal/
├── public/
├── src/
│   ├── main.tsx
│   ├── vite-env.d.ts
│   │
│   ├── app/                          # App wiring — providers, router, layouts
│   │   ├── providers/
│   │   │   ├── query-provider.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── index.tsx
│   │   ├── router/
│   │   │   └── router.tsx
│   │   └── layouts/
│   │       ├── dashboard-layout.tsx
│   │       ├── auth-layout.tsx
│   │       └── components/
│   │           ├── sidebar.tsx        # 10-module nav
│   │           ├── topbar.tsx         # notifications, theme toggle, user menu
│   │           └── breadcrumbs.tsx
│   │
│   ├── routes/                       # file-based route tree (TanStack Router)
│   │
│   ├── features/                     # === THE MODULES ===
│   │   ├── dashboard/                # KPI hub, sales overview, daily summary, AI analytics
│   │   ├── distributor-management/   # onboarding, approval, category mapping, performance, allocation
│   │   ├── employee-management/      # leave, expense, tasks, pending approvals
│   │   ├── communication/            # internal comms + WhatsApp integration
│   │   ├── team-management/          # hierarchy, monitoring, performance, productivity, incharge onboarding
│   │   ├── beat-tour/                # beat creation/allocation/programs + tour planning, route/party mapping
│   │   ├── crm-sales/                # visit forms, routes, service-center + distance allocation, meetings, market monitoring
│   │   ├── approvals/                # central inbox: tour / expense / attendance / leave
│   │   ├── gps-tracking/             # salesman GPS, route + geo monitoring, fake-location detection
│   │   ├── reports-analytics/        # sales, target, attendance, visit, expense, performance reports
│   │   ├── retailer-management/      # onboarding, mapping, performance, analytics + Field Assist import
│   │   ├── expense-tada/             # TA/DA master, effective-date + HQ-based calc, additional expenses
│   │   └── notifications/            # push, sales alerts, greetings
│   │       # each feature = api/ · components/ · hooks/ · store/ · types/ · pages/ · index.ts
│   │
│   ├── components/                   # Shared, cross-feature UI
│   │   ├── ui/                       # shadcn primitives
│   │   ├── data-table/               # reusable TanStack Table wrapper
│   │   ├── charts/                   # Recharts wrappers (sales/target analytics)
│   │   ├── maps/                     # map + GPS marker components
│   │   └── common/                   # PageHeader, EmptyState, StatusBadge, ApprovalCard...
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── query-client.ts
│   │   ├── query-keys.ts
│   │   └── utils.ts
│   │
│   ├── stores/                       # GLOBAL zustand: auth-store, ui-store
│   ├── hooks/
│   ├── types/
│   ├── config/
│   │   ├── env.ts
│   │   └── navigation.ts             # sidebar menu (the 10 modules)
│   └── styles/globals.css
│
├── CLAUDE.md
└── README.md   (+ standard config: vite, tsconfig, tailwind, components.json)
```

---

## Nav → feature mapping (where the overlaps went)

Your 10 nav sections map cleanly to feature folders, with two intentional consolidations:

- **Distributor Management** appeared under both the Dashboard section and CRM. It's one domain → one `distributor-management/` feature. "Allocate distributors to Sales Incharge" (from CRM) lives here too, since it's a distributor operation.
- **Approvals** appear as their own nav module *and* inside Employee Management. The `approvals/` feature is the central **approval inbox** (where a manager clears tour/expense/attendance/leave). The individual approve/reject **mutations** live with their source domain (e.g. leave-approval mutation in `employee-management/api/`); the inbox composes them. This avoids duplicating approval logic.

Everything else is 1:1 with your nav.

---

## Domain integration points (isolate each behind a hook/service)

These are the sales-specific pieces that touch the outside world. Keep each behind its own feature `api/` layer so the rest of the app never sees the details:

- **Field Assist import** (`retailer-management/api/`) — retailer data comes from the Field Assist app. Build an import service + `useImportRetailers` mutation; validate incoming rows with Zod.
- **WhatsApp integration** (`communication/api/`) — external messaging. Wrap the provider in one service; components call `useSendWhatsAppMessage`, never the SDK directly.
- **GPS + fake-location detection** (`gps-tracking/`) — live positions via Query `refetchInterval` (or WebSocket → `setQueryData`). Keep the fake-location heuristic as a **pure function** in the feature's `lib/` so it's testable in isolation.
- **TA/DA calculations** (`expense-tada/`) — effective-date and HQ-based rules are calculation-heavy and will change. Keep them as **pure functions** (input → amount), separate from UI and API, so you can unit-test them.

---

## Everything else is identical to the dispatch panel

Query-key factory in `lib/query-keys.ts`, small single-concern Zustand stores, one generic `<DataTable>`, `@/` path alias, kebab-case files, feature `index.ts` barrels, cross-feature imports only through barrels. Those code patterns carry over unchanged — and the design system + auth module from the dispatch redesign drop straight in.
