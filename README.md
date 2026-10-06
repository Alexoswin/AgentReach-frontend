# ReachConvert Frontend

Next.js dashboard for **ReachConvert** — an outreach platform that unifies
personalized bulk email, autonomous AI voice calling, and signal-based automation in
one workspace for exploring job opportunities and driving conversions.

**Live app:**  
This app is the operator UI. It talks to the [ReachConvert backend](../AgentReach-backend)
over REST (`NEXT_PUBLIC_API_URL`) and ships a full in-app **Documentation portal** at
`/documentation` with two explicit tracks:

- User Documentation (operator workflows, setup, launch, monitor, troubleshooting)
- Technical Documentation (architecture, data flow, module boundaries, APIs)

---

## System documentation

Contributor-facing docs for the full workspace live one level up in [`../docs`](../docs):

- [Full architecture](../docs/ARCHITECTURE.md)
- [Feature documentation index](../docs/FEATURES.md)
- [Contacts](../docs/features/contacts.md)
- [Email campaigns and templates](../docs/features/email-campaigns-and-templates.md)
- [AI calling and realtime voice](../docs/features/ai-calling-and-realtime-voice.md)
- [AI calling bots and RAG](../docs/features/ai-calling-bots-and-rag.md)
- [Signals and playbooks](../docs/features/signals-and-playbooks.md)
- [Campaign scheduler](../docs/features/scheduler.md)

The in-app `/documentation` portal includes both user and technical tracks.
The markdown files in `../docs` remain the contributor-facing technical source of truth.

---

## Tech stack

| Concern       | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| Framework     | [Next.js 16](https://nextjs.org) (App Router, RSC)           |
| Runtime       | React 19                                                     |
| Language      | TypeScript 5                                                 |
| Styling       | Tailwind CSS v4 (`@tailwindcss/postcss`)                     |
| Server state  | [TanStack Query v5](https://tanstack.com/query)              |
| Client state  | [Zustand](https://zustand-demo.pmnd.rs) (`useOutreachStore`) |
| Charts        | [Recharts](https://recharts.org)                             |
| Icons         | `lucide-react`                                               |
| Bundler (dev) | Webpack (`next dev --webpack`)                               |

---

## Application structure

The App Router lives in [`src/app`](src/app). Authenticated product screens are
grouped under the `(dashboard)` route group behind a shared layout; the marketing
login and public documentation sit outside it.

```
src/
├── app/
│   ├── (dashboard)/            # authenticated app (shared layout + AppShell)
│   │   ├── dashboard/          # cross-channel overview
│   │   ├── signals/            # signal feed + review queue
│   │   │   └── playbooks/      # automation playbooks
│   │   ├── contacts/           # contacts + directories
│   │   ├── email-campaigns/    # MailReach: templates, preview, launch, relaunch
│   │   ├── ai-calling-bots/    # Calling Agents: personas + RAG knowledge bases
│   │   ├── calling-campaigns/  # VoiceReach: AI voice calling campaigns
│   │   ├── history/            # email + call history
│   │   ├── settings/           # SES / Twilio / Gemini credentials
│   │   └── profile/            # profile, theme, accent colour, password
│   ├── documentation/          # in-app docs portal (index + [slug] pages)
│   ├── login/                  # login + password reset
│   ├── layout.tsx              # root layout
│   └── providers.tsx           # React Query + global providers
├── components/                 # AppShell, Sidebar, AuthGuard, Alert, Loader, fx…
├── lib/
│   ├── api.ts                  # typed fetch client (auth, refresh, all endpoints)
│   ├── localAuth.ts            # token/session persistence
│   ├── docs.ts                 # documentation content model (DOC_PAGES)
│   └── utils.ts
└── store/
    └── useOutreachStore.ts     # Zustand global store
```

---

## Screens

| Route                | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `/login`             | Sign in and password reset. |
| `/dashboard`         | Cross-channel overview and live metrics. |
| `/signals`           | Signal feed (funding, hiring, news, bounces) and human review queue. |
| `/signals/playbooks` | Rules that turn signals into automatic outreach. |
| `/contacts`          | Recruiter, company, hiring-team, and lead contacts + directories; CSV/XLSX import. |
| `/email-campaigns`   | **MailReach** — build/generate templates, preview, launch, and relaunch bulk email. |
| `/ai-calling-bots`   | **Calling Agents** — create agent personas with a PDF-backed RAG knowledge base. |
| `/calling-campaigns` | **VoiceReach** — configure and run AI voice calling campaigns with live outcomes. |
| `/scheduler`         | View and cancel future MailReach/VoiceReach launches. |
| `/history`           | Filterable email and call history, including replies. |
| `/settings`          | Connect AWS SES, Twilio, and Gemini; test each connection. |
| `/profile`           | User profile, theme, accent colours, and password update. |
| `/documentation`     | In-app documentation portal (see below). |

---

## Data & auth flow

- [`src/lib/api.ts`](src/lib/api.ts) is a single typed client wrapping `fetch`. It
  attaches the `Bearer` access token, **transparently refreshes** on `401` via
  `/auth/refresh`, enforces request timeouts (8s default, 45s for AI calls), and maps
  raw errors to friendly messages. Every backend resource has a typed method here
  (`api.auth`, `api.contacts`, `api.emailCampaigns`, `api.signals`, `api.aiCallingBots`,
  `api.callingCampaigns`, `api.history`, `api.analytics`, `api.settings`).
- [`src/lib/localAuth.ts`](src/lib/localAuth.ts) persists the session and tokens.
- [`src/components/AuthGuard.tsx`](src/components/AuthGuard.tsx) gates the dashboard
  group and redirects unauthenticated users to `/login`.
- Server state is cached with **TanStack Query** (configured in
  [`src/app/providers.tsx`](src/app/providers.tsx)); cross-cutting UI state lives in
  the Zustand [`useOutreachStore`](src/store/useOutreachStore.ts).

---

## Documentation portal

A first-class, in-app docs site lives under [`src/app/documentation`](src/app/documentation).
Content is authored as **data** (not JSX) in
[`src/lib/docs.ts`](src/lib/docs.ts) — an array of `DocPage` objects grouped by
track (`User Documentation`, `Technical Documentation`) and category.
Each page is rendered uniformly by `documentation/[slug]/page.tsx` with a shared
sidebar (`DocSidebar.tsx`).

Technical pages include rendered Mermaid diagrams for system topology, REST/auth flow,
NestJS module boundaries, MongoDB relationships, provider boundaries, and feature-level
architecture flows.

To add or edit docs, update the `DOC_PAGES` array in `src/lib/docs.ts`. Diagram sections
use the `diagram` field and render through `src/components/MermaidDiagram.tsx`.

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A running [ReachConvert backend](../AgentReach-backend) (default `http://localhost:3001`)

### Install & run

```bash
cd AgentReach-frontend
npm install
cp .env.example .env
npm run dev            # http://localhost:3000
```

### Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

| Variable              | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend REST API. Defaults to `http://localhost:3001/api` when unset. |

### Scripts

```bash
npm run dev      # start dev server (Webpack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

---

## Key files

```text
src/app/providers.tsx                       # React Query provider
src/app/(dashboard)/layout.tsx              # authenticated shell layout
src/app/(dashboard)/email-campaigns/page.tsx
src/app/(dashboard)/calling-campaigns/page.tsx
src/app/(dashboard)/signals/page.tsx
src/app/documentation/[slug]/page.tsx       # renders DocPage content
src/components/AuthGuard.tsx
src/components/AppShell.tsx
src/components/Sidebar.tsx
src/lib/api.ts                              # typed API client
src/lib/localAuth.ts                        # token/session storage
src/lib/docs.ts                             # documentation content
src/store/useOutreachStore.ts              # global client state
```
