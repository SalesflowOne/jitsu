# Tracking Installation Guide

## Overview

Salesflow Attribution uses **@jitsu/js** on your website to collect events, then normalizes them into Supabase via the Salesflow ingest API.

---

## Step 1: Install Jitsu on your site

Add the Jitsu snippet to your website `<head>`:

```html
<script>
  window.jitsuConfig = {
    key: "YOUR_JITSU_WRITE_KEY",
    trackingHost: "https://your-jitsu-ingest.example.com",
  };
</script>
<script async src="https://your-jitsu-ingest.example.com/p.js"></script>
```

Or use npm:

```bash
npm install @jitsu/js
```

```typescript
import { jitsuAnalytics } from "@jitsu/js";

const analytics = jitsuAnalytics({
  key: "YOUR_JITSU_WRITE_KEY",
  trackingHost: "https://your-jitsu-ingest.example.com",
});

analytics.page(); // auto page_view with UTM + click IDs
```

Jitsu automatically captures:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Click IDs from URL: `gclid`, `fbclid`, `ttclid`, `msclkid`
- `anonymousId` cookie for identity stitching

---

## Step 2: Connect Jitsu to Salesflow

Configure a Jitsu **function destination** pointing to your Salesflow ingest API:

```
POST https://attribution.salesflow.example.com/api/ingest/events
Authorization: Bearer YOUR_INGEST_API_KEY
Content-Type: application/json

{
  "org_id": "org_xxx",
  "source": "jitsu",
  "event": { ... AnalyticsServerEvent ... }
}
```

Or set `SALESFLOW_ATTRIBUTION_INGEST_URL` in rotor environment.

---

## Step 3: Track conversion events

### Form submit

```javascript
analytics.track("form_submit", {
  email: "lead@example.com",
  phone: "+15551234567",
  name: "Jane Doe",
  form_name: "contact_form",
});
```

### Call click

```javascript
document.querySelector("#call-button").addEventListener("click", () => {
  analytics.track("call_click", { phone_number: "+15551234567" });
});
```

### Booking / appointment

```javascript
analytics.track("booking_created", {
  email: "lead@example.com",
  appointment_type: "consultation",
  scheduled_at: "2026-06-15T14:00:00Z",
});
```

### Payment

```javascript
analytics.track("payment_completed", {
  email: "lead@example.com",
  revenue_amount: 4999.00,
  currency: "USD",
  payment_id: "pi_xxx",
});
```

### Closed deal (from CRM webhook)

```javascript
analytics.track("deal_closed_won", {
  email: "lead@example.com",
  revenue_amount: 12000.00,
  crm_deal_id: "deal_xxx",
});
```

---

## Step 4: Identify leads

When a lead is known, call identify to stitch anonymous history:

```javascript
analytics.identify("user_123", {
  email: "lead@example.com",
  name: "Jane Doe",
  phone: "+15551234567",
});
```

---

## Step 5: Verify in Setup dashboard

1. Go to **Dashboard → Setup**
2. Check **Jitsu Status** (connected / last event received)
3. Open **Event Debugger** to see recent events
4. Look for **Missing UTM** and **Missing Conversion** warnings

---

## UTM best practices

Always use tagged URLs in ads:

```
https://yoursite.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=cna-enrollment-june
```

Click IDs are captured automatically when present in the URL.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SALESFLOW_INGEST_API_KEY` | Secures ingest endpoint |
| `NEXT_PUBLIC_JITSU_WRITE_KEY` | Client-side tracking key |
| `NEXT_PUBLIC_JITSU_HOST` | Jitsu ingest host |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No events appearing | Check Jitsu write key and ingest API key |
| Missing UTMs | Ensure ad URLs include UTM parameters |
| Anonymous lead not linked | Call `identify()` or include email in form_submit |
| Duplicate conversions | Include unique `payment_id` or `message_id` |
