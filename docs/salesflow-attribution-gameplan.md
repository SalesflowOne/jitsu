# Salesflow Attribution — Living Gameplan

> **Status:** MVP foundation in progress  
> **Last updated:** 2026-06-07  
> **Branch:** `cursor/salesflow-attribution-e81e`

---

## 1. Vision

### What Salesflow Attribution is

Salesflow Attribution is an open-source, Hyros-style **ad-to-revenue attribution system** built on Jitsu for event collection and Supabase for analytics storage. It answers one question for business owners and agencies:

**"Which campaigns, ads, and leads actually become money?"**

This is not vanity analytics. It connects the full funnel:

**Campaign → Capture → Convert → Close → Attribute → Optimize**

### Who it serves

| Segment | Need |
|---------|------|
| Local service businesses | Know which ads produce booked jobs and revenue |
| Healthcare / training schools (CNA, etc.) | Track ad → lead → enrollment → payment |
| High-ticket service providers | Multi-touch journeys across long sales cycles |
| Agencies | Prove ROAS and cost-per-close to clients |
| Appointment-based businesses | Connect clicks to calls, bookings, and closed deals |

### Outcome it produces

- Deterministic, explainable attribution (first-touch, last-touch, linear)
- Revenue and ROAS by campaign, source, and ad platform
- Lead journey timeline from first click to closed deal
- Cost-per-lead, cost-per-appointment, cost-per-conversion metrics
- Foundation for feeding conversion signals back to ad platforms (Phase 8)

### How it fits Salesflow philosophy

```
Campaign  → ads, UTMs, click IDs
Capture   → landing pages, forms, calls, bookings
Convert   → leads, appointments, pipeline stages
Close     → payments, closed-won deals, revenue
Attribute → first/last/linear credit assignment
Optimize  → scale winners, cut losers, improve ad platform signals
```

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Customer Website / Funnel                     │
│   @jitsu/js SDK  →  page_view, form_submit, call_click, payment... │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Jitsu (collection + identity)                    │
│   • anonymous_id cookies                                           │
│   • UTM + click ID capture (gclid, fbclid, ttclid, msclkid)        │
│   • Profile Builder identity stitching                               │
│   • Rotor function → Salesflow ingest API                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Salesflow Ingest API (event normalization)              │
│   • Map Jitsu AnalyticsServerEvent → analytics.events              │
│   • Create/update analytics.leads, touchpoints, conversions        │
│   • Identity stitch: anonymous_id → lead_id                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Supabase PostgreSQL (source of truth)              │
│   analytics.* schema — events, leads, touchpoints, conversions,    │
│   ad_spend_daily, attribution_runs, attribution_results            │
│   SQL attribution functions (deterministic, versioned)             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              One OS / Salesflow Attribution Dashboard                │
│   Clerk auth + org_id multi-tenancy                                  │
│   Overview, Campaigns, Lead Journey, Models, Setup                  │
└─────────────────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Jitsu** | Event collection, anonymous ID, UTM/click ID capture, identity stitching via Profile Builder |
| **Supabase** | Source of truth for analytics data, attribution SQL, RLS multi-tenancy |
| **Clerk** | Auth, organizations, `org_id` tenant isolation |
| **One OS / Salesflow** | Native dashboard and reporting UI (`webapps/salesflow-attribution`) |
| **Landing page** | Public marketing at `/` selling the product concept |
| **Future integrations** | Ad platform APIs, CRM, payments, call tracking, offline conversion upload |

### Tenant model

| ID | Source | Usage |
|----|--------|-------|
| `org_id` | Clerk Organization ID | Primary tenant key in all `analytics.*` tables |
| `jitsu_workspace_id` | Jitsu Console workspace | Optional mapping in `analytics.integrations` for event routing |

---

## 3. Repo Audit

### Current app structure (Jitsu monorepo)

| Path | Purpose |
|------|---------|
| `webapps/console/` | Jitsu admin UI (Next.js Pages Router, Ant Design, Tailwind) |
| `webapps/shared/` | Shared email/templates |
| `webapps/salesflow-attribution/` | **NEW** — Salesflow Attribution dashboard + landing page |
| `services/rotor/` | Event routing, functions, Profile Builder runtime |
| `libs/jitsu-js/` | Browser SDK — UTM parsing, anonymous ID, page/track events |
| `libs/destination-functions/` | Destination plugins (Mixpanel already extracts click IDs) |
| `libs/salesflow-attribution/` | **NEW** — Event mapper, types, ingest logic |
| `types/protocols/` | Shared TypeScript protocols (`AnalyticsServerEvent`) |
| `supabase/migrations/` | **NEW** — Analytics schema + attribution SQL |
| `docs/` | **NEW** — Product and technical documentation |

### Auth setup (current vs target)

| Layer | Current (Jitsu Console) | Target (Salesflow Attribution) |
|-------|-------------------------|--------------------------------|
| Auth | NextAuth + Firebase/OIDC/GitHub | **Clerk** (`@clerk/nextjs`) |
| Tenant | `Workspace.id` (Prisma) | **`org_id`** (Clerk org) |
| User | `UserProfile.externalId` | Clerk `userId` |

> **Assumption:** Salesflow One OS uses Clerk. Jitsu Console remains on its own auth. The attribution webapp is a separate Next.js app with Clerk integration.

### Database setup

| System | Technology | Location |
|--------|------------|----------|
| Jitsu config/metadata | Prisma + PostgreSQL | `webapps/console/prisma/schema.prisma` |
| Salesflow analytics | Supabase PostgreSQL | `supabase/migrations/*.sql` |
| Jitsu events (raw) | MongoDB / ClickHouse / warehouses | Via Jitsu destinations |
| Profile Builder events | MongoDB | `profiles-raw-{workspaceId}-{builderId}` |

### Deployment

- Jitsu Console: Vercel (`webapps/console/vercel.json`)
- Salesflow Attribution: Vercel (new app, separate deploy)
- Supabase: hosted or self-hosted Postgres with migrations applied via CLI

### Where new code lives

```
docs/                              ← all documentation
supabase/migrations/               ← analytics schema + SQL functions
libs/salesflow-attribution/        ← shared event/attribution logic
webapps/salesflow-attribution/     ← landing page + dashboard + ingest API
libs/destination-functions/        ← Jitsu → Salesflow destination (planned)
```

### Jitsu event capabilities (already present)

- `@jitsu/js` captures UTMs in `context.campaign` (source, medium, name, content, term)
- Click IDs referenced in Mixpanel destination: `gclid`, `fbclid`, `ttclid`, `msclkid`
- `anonymousId` + `userId` identity model
- Profile Builder stitches events to user profiles

---

## 4. Database Plan

### Schema: `analytics`

| Table | Purpose | Status |
|-------|---------|--------|
| `analytics.events` | Normalized tracking events | ✅ Migration created |
| `analytics.identities` | anonymous_id ↔ lead_id ↔ user_id mapping | ✅ Migration created |
| `analytics.sessions` | Session groupings | ✅ Migration created |
| `analytics.touchpoints` | Marketing touchpoints for attribution | ✅ Migration created |
| `analytics.leads` | Known leads (email, phone, name) | ✅ Migration created |
| `analytics.conversions` | Revenue events (payment, closed-won) | ✅ Migration created |
| `analytics.ad_spend_daily` | Daily ad spend by campaign/ad | ✅ Migration created |
| `analytics.attribution_runs` | Attribution job metadata | ✅ Migration created |
| `analytics.attribution_results` | Credit assignment per conversion | ✅ Migration created |
| `analytics.tracking_links` | Dub-style trackable links | ✅ Migration created |
| `analytics.sources` | Source dimension table | ✅ Migration created |
| `analytics.campaigns` | Campaign dimension table | ✅ Migration created |
| `analytics.integrations` | Jitsu/CRM/ad platform connections | ✅ Migration created |

### Relationships

```
leads ←── identities ──→ events
  │                         │
  ├── touchpoints ←─────────┘
  ├── conversions
  │       │
  │       └── attribution_results ←── attribution_runs
  │
ad_spend_daily (by campaign/ad platform)
```

### RLS

- All tables have `org_id TEXT NOT NULL`
- RLS policies: `org_id = (auth.jwt() ->> 'org_id')` for Clerk JWT
- Service role bypasses RLS for ingest API

### Migration status

| Migration | File | Status |
|-----------|------|--------|
| Schema + indexes + RLS | `20250607000001_analytics_schema.sql` | ✅ Created |
| Attribution functions + views | `20250607000002_analytics_attribution_functions.sql` | ✅ Created |
| Seed/demo data | `20250607000003_analytics_seed_data.sql` | ✅ Created |

See [analytics-schema.md](./analytics-schema.md) for full column definitions.

---

## 5. Event Tracking Plan

### Event names (MVP)

| Event | Type | Creates |
|-------|------|---------|
| `page_view` | page | event, touchpoint (if UTM/click ID) |
| `landing_page_view` | page | event, touchpoint |
| `form_submit` | track | event, lead, touchpoint |
| `call_click` | track | event, touchpoint |
| `booking_created` | track | event, lead update, touchpoint |
| `lead_created` | track | event, lead |
| `payment_completed` | track | event, conversion |
| `deal_closed_won` | track | event, conversion |
| `refund_created` | track | event, conversion (negative) |
| `subscription_started` | track | event, conversion |
| `subscription_renewed` | track | event, conversion |
| `subscription_cancelled` | track | event |

### Payload fields captured

- Identity: `anonymous_id`, `user_id`, `lead_id`, `session_id`
- UTM: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Click IDs: `gclid`, `fbclid`, `ttclid`, `msclkid`
- Context: `url`, `referrer`, `landing_page`
- Conversion: `revenue_amount`, `currency`, `conversion_type`

### Jitsu mapping

Jitsu `AnalyticsServerEvent` → `analytics.events`:

```
event.type=page     → event_name=page_view
event.type=track    → event_name=event.event
context.campaign    → utm_* fields
properties.url      → url, landing_page
properties.gclid    → gclid (also from URL query)
anonymousId         → anonymous_id
userId              → user_id
messageId           → idempotency key
```

See [jitsu-integration.md](./jitsu-integration.md) and [tracking-installation.md](./tracking-installation.md).

### Identity stitching

1. Anonymous visitor gets `anonymous_id` via `@jitsu/js` cookie
2. On `form_submit` / `lead_created`: create `analytics.leads`, link in `analytics.identities`
3. Subsequent events with same `anonymous_id` inherit `lead_id`
4. Jitsu Profile Builder can also call identify() to set `userId`

---

## 6. Attribution Models

### Implemented (v1)

| Model | Version key | Logic |
|-------|-------------|-------|
| First-touch | `first_touch_v1` | 100% credit to earliest touchpoint in lookback window |
| Last-touch | `last_touch_v1` | 100% credit to latest touchpoint before conversion |
| Linear | `linear_v1` | Equal split across all touchpoints |

### Planned (placeholders in SQL)

| Model | Version key | Status |
|-------|-------------|--------|
| U-shaped | `u_shaped_v1` | Placeholder function |
| Time-decay | `time_decay_v1` | Placeholder function |
| Position-based | `position_based_v1` | Placeholder function |
| Custom | `custom_v1` | Placeholder function |

### Lookback windows

- Default: 90 days (configurable per run)
- Touchpoints must occur before conversion `occurred_at`
- Touchpoints must have at least one of: UTM source, campaign, or click ID

### Model versioning rules

- Model results stored with explicit version string (e.g. `first_touch_v1`)
- Never silently change attribution logic — bump version suffix
- Each run creates new `attribution_runs` row with config snapshot
- Dashboard compares models side-by-side from stored results

See [attribution-models.md](./attribution-models.md).

---

## 7. Dashboard Plan

### Pages (MVP)

| Route | View | Status |
|-------|------|--------|
| `/` | Landing page (public) | ✅ Created |
| `/dashboard` | Overview metrics | ✅ Created |
| `/dashboard/campaigns` | Campaign performance table | ✅ Created |
| `/dashboard/leads/[id]` | Lead journey timeline | ✅ Created |
| `/dashboard/attribution` | Model comparison | ✅ Created |
| `/dashboard/setup` | Tracking install + event debugger | ✅ Created |

### Overview metrics

- Total spend, leads, booked appointments, conversions, revenue
- ROAS, cost per lead, cost per conversion

### API routes

| Route | Purpose |
|-------|---------|
| `POST /api/ingest/events` | Normalized event ingestion (Jitsu + direct) |
| `POST /api/attribution/run` | Trigger attribution run |
| `GET /api/dashboard/overview` | Overview metrics |
| `GET /api/dashboard/campaigns` | Campaign table |
| `GET /api/dashboard/leads/[id]` | Lead journey |
| `GET /api/dashboard/events` | Recent events (debugger) |

---

## 8. Landing Page Plan

**Positioning:** "Know which ads actually make money."

| Section | Content |
|---------|---------|
| Hero | Headline + subheadline + CTA |
| Problem | Ad platforms show clicks, not revenue path |
| Solution | Full-funnel tracking |
| How it works | Campaign → Capture → Convert → Close → Attribute → Optimize |
| What we track | UTMs, click IDs, forms, calls, bookings, payments |
| Reports | CPL, CPA, ROAS, lead journey, attribution models |
| Why Salesflow | Build, track, optimize the machine |
| Use cases | CNA schools, local services, agencies, high-ticket |
| Final CTA | "See which ads are actually making you money" |

See [landing-page-copy.md](./landing-page-copy.md).

---

## 9. Integrations Roadmap

### Immediate (manual CSV import)

- [ ] Google Ads spend CSV
- [ ] Meta Ads spend CSV
- [ ] TikTok spend CSV
- [ ] CRM closed-won CSV
- [ ] Stripe/Square payment CSV

### Next (API integrations)

- [ ] Google Ads API
- [ ] Meta Marketing API
- [ ] TikTok Ads API
- [ ] GoHighLevel
- [ ] Pipedrive / HubSpot
- [ ] Stripe / Square
- [ ] Calendly / Google Calendar
- [ ] CallRail / Twilio call tracking

### Event feedback loop (Phase 8 — plan only)

- [ ] Google Enhanced Conversions
- [ ] Meta Conversions API
- [ ] TikTok Events API
- [ ] Offline conversion upload

See [ad-platform-roadmap.md](./ad-platform-roadmap.md).

---

## 10. Implementation Checklist

### Completed

- [x] Repo audit and architecture decisions
- [x] Living gameplan document (`docs/salesflow-attribution-gameplan.md`)
- [x] Supporting documentation (7 docs)
- [x] Supabase analytics schema migration
- [x] Attribution SQL functions (first/last/linear/u_shaped/time_decay/position_based)
- [x] Dashboard views: ROAS, CPL, CPA, lead journey, model comparison
- [x] Seed/demo data migration
- [x] Core lib: event mapper + types + CSV import
- [x] Webapp: landing page + dashboard pages
- [x] Ingest API with org_id + jitsu_workspace_id resolution
- [x] Clerk auth wiring (optional — works without keys in dev)
- [x] Jitsu destination: `builtin.destination.salesflow-attribution`
- [x] CSV import UI + API (ad spend + conversions)
- [x] Stripe webhook for payment_completed
- [x] Integrations API + Jitsu workspace mapping UI
- [x] Migration apply script: `scripts/apply-salesflow-migrations.sh`
- [x] Unit tests: 5 passing (mapper + CSV)

### In Progress

- [ ] Apply migrations to production Supabase project (needs credentials)

### Blocked

- [ ] Production Supabase project credentials (needs `SUPABASE_DATABASE_URL`)
- [ ] Clerk application credentials (optional for dev)
- [ ] Stripe webhook registration in Stripe dashboard

### Next Steps

1. Set env vars and run `./scripts/apply-salesflow-migrations.sh`
2. Configure Clerk org and enable Organizations in Clerk dashboard
3. Add Salesflow destination in Jitsu Console per workspace
4. Register Stripe webhook → `/api/webhooks/stripe`
5. Google/Meta Ads API integrations (Phase 7)

---

## 11. Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Jitsu as collection foundation, not PostHog | Jitsu already in stack; owns identity stitching, UTM capture, warehouse routing; PostHog is product analytics, not ad attribution | 2026-06-07 |
| Attribution logic in Supabase SQL | Deterministic, explainable, auditable; no black-box ML; versioned functions; dashboard reads stored results | 2026-06-07 |
| Separate webapp vs Jitsu Console pages | Salesflow uses Clerk (not NextAuth/Firebase); different tenant model (`org_id` vs `workspaceId`); commercial product separation | 2026-06-07 |
| `org_id` as primary tenant key | Matches Clerk organizations; maps to Salesflow multi-tenant model | 2026-06-07 |
| Optional `jitsu_workspace_id` mapping | Allows linking Jitsu event streams to Salesflow orgs without coupling schemas | 2026-06-07 |
| Model version suffixes (`_v1`) | Prevents silent metric changes; enables side-by-side comparison | 2026-06-07 |
| Deferred: u_shaped, time_decay implementations | MVP focuses on three explainable models; placeholders in SQL for future | 2026-06-07 |

### Open-source inspiration (patterns only, no code copy)

| Project | Patterns adopted |
|---------|-----------------|
| **Jitsu** | Event schema, anonymous ID, UTM capture, Profile Builder |
| **Dub** | Trackable links concept (`analytics.tracking_links`) |
| **Mautic** | Contact journey / lead lifecycle stages |
| **PostHog** | Dashboard layout patterns (not as foundation) |
| **Prosper202** | Click ID tracking, campaign/source hierarchy |
| **dbt/RA** | Attribution model naming, lookback windows, credit splitting |

---

## 12. Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| Clerk JWT custom claim for `org_id` | Needs config | Use `org_id` or `orgId` claim in Supabase RLS |
| Jitsu workspace ↔ Clerk org mapping | Needs product decision | 1:1 default; stored in `analytics.integrations` |
| Supabase hosted vs self-hosted | Needs deployment target | Migrations work for both |
| Revenue currency handling | Deferred | MVP assumes single currency per org (USD default) |
| Call tracking provider | Deferred | CallRail vs Twilio vs open-source |
| Where One OS embeds attribution | Future | iframe, shared auth, or unified nav TBD |

---

## Phase Log

### Phase 1 — Audit and Architecture (2026-06-07)

**What changed:**
- Audited Jitsu monorepo: console (Next.js), rotor, jitsu-js, Prisma/PostgreSQL
- Confirmed no existing Clerk/Supabase/Salesflow code in repo
- Identified Jitsu UTM + click ID capture already in `@jitsu/js` and Mixpanel destination
- Created this gameplan and 7 supporting docs

**Files created:**
- `docs/salesflow-attribution-gameplan.md`
- `docs/salesflow-attribution-master-plan.md`
- `docs/analytics-schema.md`
- `docs/tracking-installation.md`
- `docs/attribution-models.md`
- `docs/jitsu-integration.md`
- `docs/ad-platform-roadmap.md`
- `docs/landing-page-copy.md`

**Status:** Complete  
**Next:** Phase 2 — database migrations

### Phase 2 — Data Model (2026-06-07)

**What changed:**
- Created `analytics` schema with 13 tables
- Indexes on org_id, lead_id, anonymous_id, session_id, click IDs, occurred_at
- RLS policies for Clerk org_id JWT
- Seed data: 3 platforms, 5 campaigns, 20 leads, 10 bookings, 5 conversions

**Files created:**
- `supabase/migrations/20250607000001_analytics_schema.sql`
- `supabase/migrations/20250607000002_analytics_attribution_functions.sql`
- `supabase/migrations/20250607000003_analytics_seed_data.sql`

**Status:** Complete  
**Next:** Phase 3 — event ingestion layer

### Phase 3 — Event Ingestion (2026-06-07)

**What changed:**
- Created `libs/salesflow-attribution` with event mapper and ingest handler
- Created `POST /api/ingest/events` in webapp
- Maps Jitsu payloads → normalized events, leads, touchpoints, conversions

**Files created:**
- `libs/salesflow-attribution/` (package)
- `webapps/salesflow-attribution/pages/api/ingest/events.ts`

**Status:** Foundation complete  
**Next:** Jitsu rotor destination function

### Phase 4 — Attribution Engine (2026-06-07)

**What changed:**
- SQL functions: `run_first_touch_attribution`, `run_last_touch_attribution`, `run_linear_attribution`
- Dashboard views: revenue by campaign, ROAS, CPL, CPA
- Placeholder functions for u_shaped, time_decay, position_based

**Files created:**
- `supabase/migrations/20250607000002_analytics_attribution_functions.sql`

**Status:** MVP models complete  
**Next:** Wire dashboard to run attribution and display results

### Phase 5 — Dashboard MVP (2026-06-07)

**What changed:**
- Created `webapps/salesflow-attribution` Next.js app
- Pages: overview, campaigns, lead journey, attribution comparison, setup/debugger

**Files created:**
- `webapps/salesflow-attribution/` (full webapp scaffold)

**Status:** UI scaffold complete; needs Supabase connection  
**Next:** Connect API routes to live data

### Phase 7 — Full stack completion (2026-06-07)

**What changed:**
- Clerk auth (optional): sign-in/sign-up, org-scoped dashboard, UserButton
- Jitsu destination: `builtin.destination.salesflow-attribution`
- CSV import: ad spend + conversions (`/dashboard/import`)
- Stripe webhook: `POST /api/webhooks/stripe`
- Advanced attribution: u_shaped_v1, time_decay_v1, position_based_v1
- Integrations API + Jitsu workspace mapping in Setup
- org_id resolution from jitsu_workspace_id via `analytics.integrations`
- Migration script + migration 004

**Files created/modified:**
- `libs/destination-functions/src/functions/salesflow-attribution-destination.ts`
- `supabase/migrations/20250607000004_attribution_advanced_models.sql`
- `libs/salesflow-attribution/src/import/csv.ts`
- `webapps/salesflow-attribution/pages/dashboard/import.tsx`
- `webapps/salesflow-attribution/pages/api/import/*`, `api/webhooks/stripe.ts`, `api/integrations/*`
- `webapps/salesflow-attribution/lib/auth-server.ts`, `lib/clerk-config.ts`
- `scripts/apply-salesflow-migrations.sh`

**Status:** Complete (pending live Supabase/Clerk/Stripe credentials)
**Next:** Deploy with env vars; connect ad platform APIs
