-- Salesflow Attribution: attribution functions and dashboard views

-- ---------------------------------------------------------------------------
-- Get valid touchpoints for a conversion within lookback window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.get_valid_touchpoints(
  p_org_id TEXT,
  p_lead_id UUID,
  p_conversion_at TIMESTAMPTZ,
  p_lookback_days INT
)
RETURNS SETOF analytics.touchpoints
LANGUAGE sql
STABLE
AS $$
  SELECT tp.*
  FROM analytics.touchpoints tp
  WHERE tp.org_id = p_org_id
    AND tp.lead_id = p_lead_id
    AND tp.occurred_at < p_conversion_at
    AND tp.occurred_at >= p_conversion_at - (p_lookback_days || ' days')::interval
    AND (
      tp.source IS NOT NULL
      OR tp.campaign IS NOT NULL
      OR tp.click_id IS NOT NULL
    )
  ORDER BY tp.occurred_at ASC;
$$;

-- ---------------------------------------------------------------------------
-- Internal: create attribution run and assign credits
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics._run_attribution(
  p_org_id TEXT,
  p_model_name TEXT,
  p_lookback_days INT,
  p_credit_mode TEXT  -- 'first', 'last', 'linear'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id UUID;
  v_conv RECORD;
  v_tp RECORD;
  v_tps UUID[];
  v_count INT;
  v_weight NUMERIC(7, 6);
  v_credit_tp UUID;
BEGIN
  INSERT INTO analytics.attribution_runs (org_id, model_name, lookback_days, status, started_at, config)
  VALUES (p_org_id, p_model_name, p_lookback_days, 'running', now(), jsonb_build_object('credit_mode', p_credit_mode))
  RETURNING id INTO v_run_id;

  FOR v_conv IN
    SELECT c.*
    FROM analytics.conversions c
    WHERE c.org_id = p_org_id
      AND c.status = 'completed'
      AND c.lead_id IS NOT NULL
  LOOP
    v_tps := ARRAY[]::UUID[];

    FOR v_tp IN
      SELECT * FROM analytics.get_valid_touchpoints(p_org_id, v_conv.lead_id, v_conv.occurred_at, p_lookback_days)
    LOOP
      v_tps := array_append(v_tps, v_tp.id);
    END LOOP;

    v_count := coalesce(array_length(v_tps, 1), 0);
    IF v_count = 0 THEN
      CONTINUE;
    END IF;

    IF p_credit_mode = 'first' THEN
      v_credit_tp := v_tps[1];
      SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_credit_tp;
      INSERT INTO analytics.attribution_results (
        org_id, run_id, conversion_id, lead_id, touchpoint_id, model_name,
        attributed_revenue, attribution_weight, source, campaign, ad_platform
      ) VALUES (
        p_org_id, v_run_id, v_conv.id, v_conv.lead_id, v_tp.id, p_model_name,
        v_conv.revenue_amount, 1.0, v_tp.source, v_tp.campaign, v_tp.ad_platform
      );

    ELSIF p_credit_mode = 'last' THEN
      v_credit_tp := v_tps[v_count];
      SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_credit_tp;
      INSERT INTO analytics.attribution_results (
        org_id, run_id, conversion_id, lead_id, touchpoint_id, model_name,
        attributed_revenue, attribution_weight, source, campaign, ad_platform
      ) VALUES (
        p_org_id, v_run_id, v_conv.id, v_conv.lead_id, v_tp.id, p_model_name,
        v_conv.revenue_amount, 1.0, v_tp.source, v_tp.campaign, v_tp.ad_platform
      );

    ELSIF p_credit_mode = 'linear' THEN
      v_weight := 1.0 / v_count;
      FOREACH v_credit_tp IN ARRAY v_tps
      LOOP
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_credit_tp;
        INSERT INTO analytics.attribution_results (
          org_id, run_id, conversion_id, lead_id, touchpoint_id, model_name,
          attributed_revenue, attribution_weight, source, campaign, ad_platform
        ) VALUES (
          p_org_id, v_run_id, v_conv.id, v_conv.lead_id, v_tp.id, p_model_name,
          round(v_conv.revenue_amount * v_weight, 2), v_weight,
          v_tp.source, v_tp.campaign, v_tp.ad_platform
        );
      END LOOP;
    END IF;
  END LOOP;

  UPDATE analytics.attribution_runs
  SET status = 'completed', completed_at = now()
  WHERE id = v_run_id;

  RETURN v_run_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE analytics.attribution_runs
  SET status = 'failed', completed_at = now(), error_message = SQLERRM
  WHERE id = v_run_id;
  RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public attribution runners
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.run_first_touch_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE sql
AS $$
  SELECT analytics._run_attribution(p_org_id, 'first_touch_v1', p_lookback_days, 'first');
$$;

CREATE OR REPLACE FUNCTION analytics.run_last_touch_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE sql
AS $$
  SELECT analytics._run_attribution(p_org_id, 'last_touch_v1', p_lookback_days, 'last');
$$;

CREATE OR REPLACE FUNCTION analytics.run_linear_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE sql
AS $$
  SELECT analytics._run_attribution(p_org_id, 'linear_v1', p_lookback_days, 'linear');
$$;

-- Placeholder functions for future models
CREATE OR REPLACE FUNCTION analytics.run_u_shaped_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'u_shaped_v1 not yet implemented — use first_touch_v1, last_touch_v1, or linear_v1';
END;
$$;

CREATE OR REPLACE FUNCTION analytics.run_time_decay_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'time_decay_v1 not yet implemented — use first_touch_v1, last_touch_v1, or linear_v1';
END;
$$;

CREATE OR REPLACE FUNCTION analytics.run_position_based_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'position_based_v1 not yet implemented — use first_touch_v1, last_touch_v1, or linear_v1';
END;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard views
-- ---------------------------------------------------------------------------

-- Revenue by campaign (from latest completed run per model, or raw conversions fallback)
CREATE OR REPLACE VIEW analytics.v_revenue_by_campaign AS
SELECT
  ar.org_id,
  ar.model_name,
  coalesce(ar.campaign, 'unknown') AS campaign,
  coalesce(ar.source, 'unknown') AS source,
  coalesce(ar.ad_platform, 'unknown') AS ad_platform,
  sum(ar.attributed_revenue) AS attributed_revenue,
  count(DISTINCT ar.conversion_id) AS conversions
FROM analytics.attribution_results ar
GROUP BY ar.org_id, ar.model_name, ar.campaign, ar.source, ar.ad_platform;

-- Ad spend aggregated by campaign
CREATE OR REPLACE VIEW analytics.v_spend_by_campaign AS
SELECT
  org_id,
  platform,
  coalesce(campaign_name, campaign_id, 'unknown') AS campaign,
  sum(spend) AS total_spend,
  sum(impressions) AS total_impressions,
  sum(clicks) AS total_clicks,
  min(date) AS first_date,
  max(date) AS last_date
FROM analytics.ad_spend_daily
GROUP BY org_id, platform, coalesce(campaign_name, campaign_id, 'unknown');

-- ROAS by campaign (joins attribution + spend on campaign name)
CREATE OR REPLACE VIEW analytics.v_roas_by_campaign AS
SELECT
  r.org_id,
  r.model_name,
  r.campaign,
  r.source,
  r.ad_platform,
  r.attributed_revenue,
  r.conversions,
  coalesce(s.total_spend, 0) AS spend,
  CASE
    WHEN coalesce(s.total_spend, 0) > 0
    THEN round(r.attributed_revenue / s.total_spend, 2)
    ELSE NULL
  END AS roas
FROM analytics.v_revenue_by_campaign r
LEFT JOIN analytics.v_spend_by_campaign s
  ON s.org_id = r.org_id
 AND lower(s.campaign) = lower(r.campaign)
 AND lower(s.platform) = lower(r.ad_platform);

-- Funnel counts
CREATE OR REPLACE VIEW analytics.v_funnel_metrics AS
SELECT
  l.org_id,
  count(DISTINCT l.id) AS total_leads,
  count(DISTINCT l.id) FILTER (WHERE l.status IN ('booked', 'qualified', 'converted')) AS booked_or_beyond,
  count(DISTINCT c.id) AS total_conversions,
  coalesce(sum(c.revenue_amount), 0) AS total_revenue
FROM analytics.leads l
LEFT JOIN analytics.conversions c ON c.lead_id = l.id AND c.org_id = l.org_id AND c.status = 'completed'
GROUP BY l.org_id;

-- Cost metrics (requires spend data)
CREATE OR REPLACE VIEW analytics.v_cost_metrics AS
SELECT
  f.org_id,
  f.total_leads,
  f.booked_or_beyond AS booked_appointments,
  f.total_conversions,
  f.total_revenue,
  coalesce(sp.total_spend, 0) AS total_spend,
  CASE WHEN f.total_leads > 0 AND coalesce(sp.total_spend, 0) > 0
    THEN round(sp.total_spend / f.total_leads, 2) END AS cost_per_lead,
  CASE WHEN f.booked_or_beyond > 0 AND coalesce(sp.total_spend, 0) > 0
    THEN round(sp.total_spend / f.booked_or_beyond, 2) END AS cost_per_appointment,
  CASE WHEN f.total_conversions > 0 AND coalesce(sp.total_spend, 0) > 0
    THEN round(sp.total_spend / f.total_conversions, 2) END AS cost_per_conversion,
  CASE WHEN f.total_leads > 0
    THEN round(f.total_conversions::numeric / f.total_leads * 100, 1) END AS lead_to_close_pct
FROM analytics.v_funnel_metrics f
LEFT JOIN (
  SELECT org_id, sum(spend) AS total_spend
  FROM analytics.ad_spend_daily
  GROUP BY org_id
) sp ON sp.org_id = f.org_id;

-- Lead journey view
CREATE OR REPLACE VIEW analytics.v_lead_journey AS
SELECT
  l.org_id,
  l.id AS lead_id,
  l.email,
  l.name,
  l.status,
  l.first_seen_at,
  (
    SELECT json_agg(json_build_object(
      'id', tp.id,
      'source', tp.source,
      'medium', tp.medium,
      'campaign', tp.campaign,
      'ad_platform', tp.ad_platform,
      'landing_page', tp.landing_page,
      'occurred_at', tp.occurred_at
    ) ORDER BY tp.occurred_at)
    FROM analytics.touchpoints tp
    WHERE tp.lead_id = l.id AND tp.org_id = l.org_id
  ) AS touchpoints,
  (
    SELECT json_agg(json_build_object(
      'id', c.id,
      'type', c.conversion_type,
      'revenue', c.revenue_amount,
      'occurred_at', c.occurred_at
    ) ORDER BY c.occurred_at)
    FROM analytics.conversions c
    WHERE c.lead_id = l.id AND c.org_id = l.org_id
  ) AS conversions,
  (
    SELECT tp.source FROM analytics.touchpoints tp
    WHERE tp.lead_id = l.id AND tp.org_id = l.org_id
    ORDER BY tp.occurred_at ASC LIMIT 1
  ) AS first_touch_source,
  (
    SELECT tp.source FROM analytics.touchpoints tp
    WHERE tp.lead_id = l.id AND tp.org_id = l.org_id
    ORDER BY tp.occurred_at DESC LIMIT 1
  ) AS last_touch_source,
  coalesce((
    SELECT sum(c.revenue_amount) FROM analytics.conversions c
    WHERE c.lead_id = l.id AND c.org_id = l.org_id AND c.status = 'completed'
  ), 0) AS total_revenue
FROM analytics.leads l;

-- Attribution model comparison
CREATE OR REPLACE VIEW analytics.v_attribution_comparison AS
SELECT
  org_id,
  model_name,
  coalesce(source, 'unknown') AS source,
  coalesce(campaign, 'unknown') AS campaign,
  coalesce(ad_platform, 'unknown') AS ad_platform,
  sum(attributed_revenue) AS attributed_revenue,
  count(DISTINCT conversion_id) AS conversions,
  round(avg(attribution_weight), 4) AS avg_weight
FROM analytics.attribution_results
GROUP BY org_id, model_name, source, campaign, ad_platform;
