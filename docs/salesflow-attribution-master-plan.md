# Salesflow Attribution — Master Plan

> Detailed technical plan. For the living status tracker, see [salesflow-attribution-gameplan.md](./salesflow-attribution-gameplan.md).

## Executive Summary

Salesflow Attribution is a multi-tenant ad-to-revenue attribution product built on:

1. **Jitsu** — event collection, anonymous identity, UTM/click ID capture
2. **Supabase** — analytics data warehouse and deterministic attribution SQL
3. **Clerk** — authentication and organization-based multi-tenancy
4. **One OS / Salesflow webapp** — dashboard, landing page, setup tools

**Core promise:** "We show you which campaigns, ads, and leads actually become money."

---

## Phase 1 — Audit and Architecture

### Findings

The Jitsu monorepo (`/workspace`) is an open-source data pipeline platform:

- **Console:** Next.js Pages Router, Ant Design, Tailwind, Prisma + PostgreSQL
- **Auth:** NextAuth + Firebase/OIDC (not Clerk)
- **Tenancy:** `Workspace` model with `workspaceId`
- **Events:** `@jitsu/js` SDK, rotor service, Profile Builder (MongoDB)
- **No existing:** Clerk, Supabase, Salesflow, or attribution code

### Architecture decision

Build Salesflow Attribution as a **separate webapp** within the monorepo:

```
webapps/salesflow-attribution/   ← Clerk auth, Supabase data, landing + dashboard
libs/salesflow-attribution/      ← Shared event mapping and types
supabase/migrations/             ← Analytics schema (separate from Jitsu Prisma DB)
```

Map tenants via:
- `org_id` (Clerk) — primary key in analytics tables
- `jitsu_workspace_id` — optional link in `analytics.integrations`

---

## Phase 2 — Data Model

See [analytics-schema.md](./analytics-schema.md) for full definitions.

Apply migrations:

```bash
supabase db push
# or
psql $DATABASE_URL -f supabase/migrations/20250607000001_analytics_schema.sql
psql $DATABASE_URL -f supabase/migrations/20250607000002_analytics_attribution_functions.sql
psql $DATABASE_URL -f supabase/migrations/20250607000003_analytics_seed_data.sql
```

---

## Phase 3 — Event Ingestion

### Flow

```
Website → @jitsu/js → Jitsu Ingest → Rotor Function → POST /api/ingest/events → Supabase
```

### Normalization rules

1. Every incoming event → `analytics.events`
2. If UTM or click ID present → `analytics.touchpoints`
3. If identify event or form with email → `analytics.leads` + `analytics.identities`
4. If payment/deal event → `analytics.conversions`

---

## Phase 4 — Attribution Engine

Run via SQL or API:

```sql
SELECT analytics.run_first_touch_attribution('org_demo', 90);
SELECT analytics.run_last_touch_attribution('org_demo', 90);
SELECT analytics.run_linear_attribution('org_demo', 90);
```

Query results:

```sql
SELECT * FROM analytics.v_revenue_by_campaign WHERE org_id = 'org_demo';
SELECT * FROM analytics.v_roas_by_campaign WHERE org_id = 'org_demo';
```

---

## Phase 5 — Dashboard MVP

Five dashboard views + setup page. See gameplan Section 7.

---

## Phase 6 — Landing Page

Public marketing page. See [landing-page-copy.md](./landing-page-copy.md).

---

## Phase 7–10

See gameplan Sections 9–10 and individual doc files.

---

## Deliverables Checklist

| # | Deliverable | Location | Status |
|---|-------------|----------|--------|
| 1 | Master plan | `docs/salesflow-attribution-gameplan.md` | ✅ |
| 2 | Database schema/migrations | `supabase/migrations/` | ✅ |
| 3 | Event model | `libs/salesflow-attribution/src/` | ✅ |
| 4 | Attribution SQL | `supabase/migrations/20250607000002_*` | ✅ |
| 5 | Dashboard MVP pages | `webapps/salesflow-attribution/` | ✅ |
| 6 | Landing page | `webapps/salesflow-attribution/pages/index.tsx` | ✅ |
| 7 | Seed/demo data | `supabase/migrations/20250607000003_*` | ✅ |
| 8 | Integration roadmap | `docs/ad-platform-roadmap.md` | ✅ |
| 9 | Tracking guide | `docs/tracking-installation.md` | ✅ |
| 10 | Next-step checklist | gameplan Section 10 | ✅ |
