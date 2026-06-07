# Jitsu Integration

## Role of Jitsu in Salesflow Attribution

Jitsu is the **event collection and identity stitching foundation**. It is not replaced by PostHog or any other analytics tool.

| Capability | Jitsu component |
|------------|-----------------|
| Browser tracking | `@jitsu/js` (`libs/jitsu-js/`) |
| UTM capture | `context.campaign` in page events |
| Click IDs | URL query params → event properties |
| Anonymous ID | `__anon_id` cookie |
| Identity stitching | Profile Builder (`services/rotor/`) |
| Event routing | Rotor → Salesflow ingest function |

---

## Event schema mapping

Jitsu `AnalyticsServerEvent` → `analytics.events`:

| Jitsu field | Analytics column |
|-------------|------------------|
| `messageId` | `message_id` (idempotency) |
| `anonymousId` | `anonymous_id` |
| `userId` | `user_id` |
| `type` | `event_type` |
| `event` (track name) | `event_name` |
| `context.campaign.source` | `utm_source` |
| `context.campaign.medium` | `utm_medium` |
| `context.campaign.name` | `utm_campaign` |
| `context.campaign.content` | `utm_content` |
| `context.campaign.term` | `utm_term` |
| `properties.url` | `url` |
| `context.page.referrer` | `referrer` |
| `properties.gclid` | `gclid` |
| `properties.fbclid` | `fbclid` |
| `properties.ttclid` | `ttclid` |
| `properties.msclkid` | `msclkid` |
| `timestamp` | `occurred_at` |
| (full payload) | `metadata` |

### Page events

```
type: "page" → event_name: "page_view"
```

If URL matches a configured landing page pattern → also emit `landing_page_view`.

---

## UTM capture (already in Jitsu)

From `libs/jitsu-js/src/analytics-plugin.ts`:

- Parses `utm_*` query params on page load
- Stores in `context.campaign` object
- Persists across SPA navigation

---

## Click ID capture

From `libs/destination-functions/src/functions/mixpanel-destination.ts`:

```typescript
const CLICK_IDS = ["dclid", "fbclid", "gclid", "ko_click_id", "li_fat_id", "msclkid", "ttclid", "twclid", "wbraid"];
```

Salesflow mapper extracts these from URL query string and event properties.

---

## Identity stitching

### Via Jitsu Profile Builder

Profile Builder aggregates events by `userId` / `anonymousId` in MongoDB.
Salesflow reads the stitched identity via ingest events — when Jitsu calls `identify()`, the ingest layer links `anonymous_id → lead_id`.

### Via Salesflow ingest

On `form_submit` or `lead_created` with email:
1. Upsert `analytics.leads`
2. Insert `analytics.identities` linking `anonymous_id → lead_id`
3. Backfill `lead_id` on future events with same `anonymous_id`

---

## Rotor destination function (planned)

Create a Jitsu function destination in `libs/destination-functions/`:

```typescript
// salesflow-attribution-destination.ts
export const salesflowAttributionDestination: JitsuFunction = async (event, ctx) => {
  const ingestUrl = ctx.props.ingestUrl;
  const apiKey = ctx.props.apiKey;
  const orgId = ctx.props.orgId;

  await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ org_id: orgId, source: "jitsu", event }),
  });
};
```

Configure in Jitsu Console: add destination to your site source connection.

---

## Workspace → org mapping

Store in `analytics.integrations`:

```sql
INSERT INTO analytics.integrations (org_id, integration_type, jitsu_workspace_id, config)
VALUES ('org_clerk_xxx', 'jitsu', 'ws_jitsu_yyy', '{"write_key": "..."}');
```

The rotor function reads `org_id` from destination config props.

---

## Profile Builder complement

Use Profile Builder for:
- Complex trait computation
- Cross-device identity (when userId is set)
- Enrichment before warehouse sync

Salesflow Attribution reads the **normalized output** via ingest — it does not duplicate Profile Builder logic.

---

## Testing locally

1. Start Jitsu dev stack: `pnpm dev`
2. Start Salesflow Attribution: `pnpm --filter salesflow-attribution dev`
3. Send test event:

```bash
curl -X POST http://localhost:3001/api/ingest/events \
  -H "Authorization: Bearer dev-ingest-key" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org_demo",
    "source": "jitsu",
    "event": {
      "type": "page",
      "anonymousId": "anon_test_1",
      "timestamp": "2026-06-07T12:00:00Z",
      "context": {
        "campaign": { "source": "google", "medium": "cpc", "name": "test-campaign" },
        "page": { "url": "https://example.com/landing?utm_source=google", "referrer": "https://google.com" }
      },
      "properties": { "url": "https://example.com/landing?utm_source=google", "gclid": "abc123" }
    }
  }'
```
