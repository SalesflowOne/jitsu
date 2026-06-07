-- Advanced attribution models: u_shaped, time_decay, position_based

CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_org_type ON analytics.integrations (org_id, integration_type);

CREATE OR REPLACE FUNCTION analytics._insert_attribution_credit(
  p_org_id TEXT,
  p_run_id UUID,
  p_conv analytics.conversions,
  p_tp analytics.touchpoints,
  p_model_name TEXT,
  p_weight NUMERIC,
  p_revenue NUMERIC
)
RETURNS VOID
LANGUAGE sql
AS $$
  INSERT INTO analytics.attribution_results (
    org_id, run_id, conversion_id, lead_id, touchpoint_id, model_name,
    attributed_revenue, attribution_weight, source, campaign, ad_platform
  ) VALUES (
    p_org_id, p_run_id, p_conv.id, p_conv.lead_id, p_tp.id, p_model_name,
    round(p_revenue * p_weight, 2), p_weight,
    p_tp.source, p_tp.campaign, p_tp.ad_platform
  );
$$;

CREATE OR REPLACE FUNCTION analytics._run_attribution(
  p_org_id TEXT,
  p_model_name TEXT,
  p_lookback_days INT,
  p_credit_mode TEXT,
  p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id UUID;
  v_conv RECORD;
  v_tp analytics.touchpoints;
  v_tps UUID[];
  v_weights NUMERIC[];
  v_count INT;
  v_weight NUMERIC(7, 6);
  v_credit_tp UUID;
  v_i INT;
  v_half_life NUMERIC;
  v_days_before NUMERIC;
  v_raw_weight NUMERIC;
  v_weight_sum NUMERIC;
  v_first_pct NUMERIC := coalesce((p_config->>'first_pct')::numeric, 0.4);
  v_last_pct NUMERIC := coalesce((p_config->>'last_pct')::numeric, 0.4);
  v_middle_pct NUMERIC := coalesce((p_config->>'middle_pct')::numeric, 0.2);
BEGIN
  INSERT INTO analytics.attribution_runs (org_id, model_name, lookback_days, status, started_at, config)
  VALUES (p_org_id, p_model_name, p_lookback_days, 'running', now(), p_config || jsonb_build_object('credit_mode', p_credit_mode))
  RETURNING id INTO v_run_id;

  v_half_life := coalesce((p_config->>'half_life_days')::numeric, 7);

  FOR v_conv IN
    SELECT c.* FROM analytics.conversions c
    WHERE c.org_id = p_org_id AND c.status = 'completed' AND c.lead_id IS NOT NULL
  LOOP
    v_tps := ARRAY[]::UUID[];
    v_weights := ARRAY[]::NUMERIC[];

    FOR v_tp IN
      SELECT * FROM analytics.get_valid_touchpoints(p_org_id, v_conv.lead_id, v_conv.occurred_at, p_lookback_days)
    LOOP
      v_tps := array_append(v_tps, v_tp.id);
    END LOOP;

    v_count := coalesce(array_length(v_tps, 1), 0);
    IF v_count = 0 THEN CONTINUE; END IF;

    IF p_credit_mode = 'first' THEN
      SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[1];
      PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 1.0, v_conv.revenue_amount);

    ELSIF p_credit_mode = 'last' THEN
      SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[v_count];
      PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 1.0, v_conv.revenue_amount);

    ELSIF p_credit_mode = 'linear' THEN
      v_weight := 1.0 / v_count;
      FOREACH v_credit_tp IN ARRAY v_tps LOOP
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_credit_tp;
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_weight, v_conv.revenue_amount);
      END LOOP;

    ELSIF p_credit_mode = 'u_shaped' THEN
      IF v_count = 1 THEN
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[1];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 1.0, v_conv.revenue_amount);
      ELSIF v_count = 2 THEN
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[1];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 0.5, v_conv.revenue_amount);
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[2];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 0.5, v_conv.revenue_amount);
      ELSE
        v_weight := v_middle_pct / (v_count - 2);
        FOR v_i IN 1..v_count LOOP
          SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[v_i];
          IF v_i = 1 THEN
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_first_pct, v_conv.revenue_amount);
          ELSIF v_i = v_count THEN
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_last_pct, v_conv.revenue_amount);
          ELSE
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_weight, v_conv.revenue_amount);
          END IF;
        END LOOP;
      END IF;

    ELSIF p_credit_mode = 'time_decay' THEN
      v_weight_sum := 0;
      FOR v_i IN 1..v_count LOOP
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[v_i];
        v_days_before := extract(epoch FROM (v_conv.occurred_at - v_tp.occurred_at)) / 86400.0;
        v_raw_weight := power(2, -v_days_before / v_half_life);
        v_weights := array_append(v_weights, v_raw_weight);
        v_weight_sum := v_weight_sum + v_raw_weight;
      END LOOP;
      FOR v_i IN 1..v_count LOOP
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[v_i];
        v_weight := v_weights[v_i] / nullif(v_weight_sum, 0);
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_weight, v_conv.revenue_amount);
      END LOOP;

    ELSIF p_credit_mode = 'position_based' THEN
      -- 30% first, 30% last, 40% middle (HubSpot-style default)
      v_first_pct := coalesce((p_config->>'first_pct')::numeric, 0.3);
      v_last_pct := coalesce((p_config->>'last_pct')::numeric, 0.3);
      v_middle_pct := coalesce((p_config->>'middle_pct')::numeric, 0.4);
      IF v_count = 1 THEN
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[1];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 1.0, v_conv.revenue_amount);
      ELSIF v_count = 2 THEN
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[1];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 0.5, v_conv.revenue_amount);
        SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[2];
        PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, 0.5, v_conv.revenue_amount);
      ELSE
        v_weight := v_middle_pct / (v_count - 2);
        FOR v_i IN 1..v_count LOOP
          SELECT * INTO v_tp FROM analytics.touchpoints WHERE id = v_tps[v_i];
          IF v_i = 1 THEN
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_first_pct, v_conv.revenue_amount);
          ELSIF v_i = v_count THEN
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_last_pct, v_conv.revenue_amount);
          ELSE
            PERFORM analytics._insert_attribution_credit(p_org_id, v_run_id, v_conv, v_tp, p_model_name, v_weight, v_conv.revenue_amount);
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  UPDATE analytics.attribution_runs SET status = 'completed', completed_at = now() WHERE id = v_run_id;
  RETURN v_run_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE analytics.attribution_runs SET status = 'failed', completed_at = now(), error_message = SQLERRM WHERE id = v_run_id;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION analytics.run_u_shaped_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID LANGUAGE sql AS $$
  SELECT analytics._run_attribution(p_org_id, 'u_shaped_v1', p_lookback_days, 'u_shaped');
$$;

CREATE OR REPLACE FUNCTION analytics.run_time_decay_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90, p_half_life_days INT DEFAULT 7)
RETURNS UUID LANGUAGE sql AS $$
  SELECT analytics._run_attribution(p_org_id, 'time_decay_v1', p_lookback_days, 'time_decay', jsonb_build_object('half_life_days', p_half_life_days));
$$;

CREATE OR REPLACE FUNCTION analytics.run_position_based_attribution(p_org_id TEXT, p_lookback_days INT DEFAULT 90)
RETURNS UUID LANGUAGE sql AS $$
  SELECT analytics._run_attribution(p_org_id, 'position_based_v1', p_lookback_days, 'position_based');
$$;

-- Resolve org_id from Jitsu workspace
CREATE OR REPLACE FUNCTION analytics.resolve_org_id(p_org_id TEXT, p_jitsu_workspace_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(p_org_id, ''),
    (SELECT i.org_id FROM analytics.integrations i
     WHERE i.jitsu_workspace_id = p_jitsu_workspace_id
       AND i.integration_type = 'jitsu'
       AND i.status = 'active'
     LIMIT 1)
  );
$$;
