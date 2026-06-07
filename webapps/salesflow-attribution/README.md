# Salesflow Attribution webapp

Next.js app for Salesflow Attribution — landing page, dashboard, and ingest API.

## Development

```bash
pnpm install
pnpm --filter salesflow-attribution dev
```

Open http://localhost:3001

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_DATABASE_URL` | Postgres connection (Supabase direct or pooler URL) |
| `SALESFLOW_INGEST_API_KEY` | Secures `POST /api/ingest/events` (default: `dev-ingest-key`) |
| `SALESFLOW_DEMO_ORG_ID` | Org ID for dashboard queries (default: `org_demo`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (future) |
| `CLERK_SECRET_KEY` | Clerk auth (future) |

Without a database URL, the dashboard shows demo data.

## Apply migrations

```bash
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250607000001_analytics_schema.sql
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250607000002_analytics_attribution_functions.sql
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250607000003_analytics_seed_data.sql
```

## Test ingest

```bash
curl -X POST http://localhost:3001/api/ingest/events \
  -H "Authorization: Bearer dev-ingest-key" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org_demo",
    "source": "jitsu",
    "event": {
      "type": "page",
      "anonymousId": "anon_test",
      "messageId": "msg_test_1",
      "timestamp": "2026-06-07T12:00:00.000Z",
      "context": {
        "campaign": { "source": "google", "medium": "cpc", "name": "test" },
        "page": { "url": "https://example.com?gclid=test123" }
      },
      "properties": { "url": "https://example.com?gclid=test123" }
    }
  }'
```
