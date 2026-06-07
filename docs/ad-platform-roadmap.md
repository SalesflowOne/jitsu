# Ad Platform Integration Roadmap

## Phase 1 — Manual CSV Import (MVP)

| Platform | Data | Import fields |
|----------|------|---------------|
| Google Ads | Spend report | date, campaign_id, campaign_name, spend, impressions, clicks |
| Meta Ads | Spend report | date, campaign_id, campaign_name, adset_id, ad_id, spend, impressions, clicks |
| TikTok Ads | Spend report | date, campaign_id, spend, impressions, clicks |
| CRM (generic) | Closed deals | email, deal_value, closed_date, crm_deal_id |
| Stripe | Payments | email, amount, currency, payment_id, created_at |
| Square | Payments | email, amount, payment_id, created_at |

**Target table:** `analytics.ad_spend_daily`, `analytics.conversions`

**UI:** Dashboard → Setup → Import CSV (planned)

---

## Phase 2 — API Integrations

### Ad platforms

| Platform | API | Data | Priority |
|----------|-----|------|----------|
| Google Ads | Google Ads API | Campaign/ad spend, conversions | High |
| Meta | Marketing API | Campaign/adset/ad spend | High |
| TikTok | TikTok Ads API | Campaign spend | Medium |
| Microsoft | Microsoft Advertising API | Campaign spend | Medium |

### CRM

| Platform | API | Data | Priority |
|----------|-----|------|----------|
| GoHighLevel | REST API | Contacts, opportunities, pipeline stages | High |
| HubSpot | CRM API | Deals, contacts | Medium |
| Pipedrive | REST API | Deals, persons | Medium |

### Payments

| Platform | API | Data | Priority |
|----------|-----|------|----------|
| Stripe | Webhooks + API | payment_intent.succeeded | High |
| Square | Webhooks + API | payment.created | Medium |

### Scheduling

| Platform | API | Data | Priority |
|----------|-----|------|----------|
| Calendly | Webhooks | invitee.created | High |
| Google Calendar | API | Events with attendee email | Medium |

### Call tracking

| Platform | API | Data | Priority |
|----------|-----|------|----------|
| CallRail | Webhooks | call.completed, caller number | High |
| Twilio | Webhooks | call status, from number | Medium |

---

## Phase 3 — Event Feedback Loop

Send conversion signals back to ad platforms for optimization:

| Platform | Method | Events |
|----------|--------|--------|
| Google | Enhanced Conversions API | qualified_lead, purchase, closed_won |
| Meta | Conversions API (CAPI) | Lead, Purchase, CompleteRegistration |
| TikTok | Events API | CompletePayment, SubmitForm |
| Google | Offline Conversion Import | closed_won with gclid |
| Meta | Offline Events | closed_won with fbclid |

**Architecture:** Supabase trigger or scheduled job reads `analytics.conversions` + touchpoint click IDs → sends to platform APIs.

**Moat:** This feedback loop is what makes attribution actionable, not just reportable.

---

## Integration storage

All connections stored in `analytics.integrations`:

```json
{
  "integration_type": "google_ads",
  "config": {
    "customer_id": "1234567890",
    "refresh_token": "encrypted...",
    "sync_frequency": "daily"
  },
  "status": "active"
}
```

---

## OAuth flow (planned)

1. User clicks "Connect Google Ads" in Setup dashboard
2. OAuth redirect → store refresh token encrypted in `integrations.config`
3. Nightly cron syncs spend → `ad_spend_daily`
4. Dashboard ROAS updates automatically

---

## Priority order

1. ✅ Jitsu event ingest (foundation)
2. CSV import for ad spend (unblocks ROAS without API keys)
3. Stripe webhook for payments
4. Google Ads API spend sync
5. Meta Marketing API spend sync
6. GoHighLevel CRM sync
7. Google Enhanced Conversions feedback
8. Meta CAPI feedback
