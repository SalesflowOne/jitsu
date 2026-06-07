# Attribution Models

Salesflow Attribution uses **deterministic, versioned SQL models**. No black-box ML.

## Model versions

| Model | Key | Status |
|-------|-----|--------|
| First-touch | `first_touch_v1` | ✅ Implemented |
| Last-touch | `last_touch_v1` | ✅ Implemented |
| Linear multi-touch | `linear_v1` | ✅ Implemented |
| U-shaped | `u_shaped_v1` | 🔲 Placeholder |
| Time-decay | `time_decay_v1` | 🔲 Placeholder |
| Position-based | `position_based_v1` | 🔲 Placeholder |
| Custom | `custom_v1` | 🔲 Placeholder |

**Rule:** Never change logic under an existing version key. Bump to `_v2` instead.

---

## Lookback window

Default: **90 days** before conversion.

A touchpoint is valid if:
1. `touchpoint.lead_id = conversion.lead_id`
2. `touchpoint.occurred_at < conversion.occurred_at`
3. `touchpoint.occurred_at >= conversion.occurred_at - lookback_days`
4. Touchpoint has at least one attribution signal (source, campaign, or click_id)

---

## First-touch (`first_touch_v1`)

**100% credit to the earliest valid touchpoint.**

```
Touchpoints:  Google → Meta → Direct → Conversion ($5,000)
Credit:       $5,000 to Google (first)
```

Use when: Measuring which channel **introduced** the customer.

---

## Last-touch (`last_touch_v1`)

**100% credit to the latest valid touchpoint before conversion.**

```
Touchpoints:  Google → Meta → Direct → Conversion ($5,000)
Credit:       $5,000 to Direct (last before conversion)
```

Use when: Measuring which channel **closed** the customer.

---

## Linear (`linear_v1`)

**Equal credit split across all valid touchpoints.**

```
Touchpoints:  Google → Meta → Direct → Conversion ($5,000)
Credit:       $1,667 each (3 touchpoints)
```

Use when: Acknowledging that multiple channels contributed.

---

## U-shaped (`u_shaped_v1`) — Planned

40% first, 40% last, 20% split among middle touchpoints.

---

## Time-decay (`time_decay_v1`) — Planned

Exponential decay — touchpoints closer to conversion get more credit.
Half-life configurable (default 7 days).

---

## Running attribution

```sql
-- Returns run_id
SELECT analytics.run_first_touch_attribution('org_demo', 90);
SELECT analytics.run_last_touch_attribution('org_demo', 90);
SELECT analytics.run_linear_attribution('org_demo', 90);
```

Via API:

```bash
curl -X POST /api/attribution/run \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model": "first_touch_v1", "lookback_days": 90}'
```

---

## Querying results

```sql
-- Compare models side-by-side
SELECT
  model_name,
  source,
  campaign,
  SUM(attributed_revenue) AS revenue
FROM analytics.attribution_results
WHERE org_id = 'org_demo'
GROUP BY model_name, source, campaign
ORDER BY model_name, revenue DESC;
```

---

## Dashboard metrics derived from attribution

| Metric | Formula |
|--------|---------|
| ROAS | attributed_revenue / spend |
| Cost per lead | spend / leads |
| Cost per appointment | spend / booked_appointments |
| Cost per conversion | spend / conversions |
| Lead-to-close rate | conversions / leads |

Views: `analytics.v_revenue_by_campaign`, `analytics.v_roas_by_campaign`, `analytics.v_cost_metrics`
