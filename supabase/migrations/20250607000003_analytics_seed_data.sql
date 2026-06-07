-- Salesflow Attribution: demo seed data
-- Org: org_demo (replace with real Clerk org_id in production)

-- Clean demo data (idempotent re-run)
DELETE FROM analytics.attribution_results WHERE org_id = 'org_demo';
DELETE FROM analytics.attribution_runs WHERE org_id = 'org_demo';
DELETE FROM analytics.ad_spend_daily WHERE org_id = 'org_demo';
DELETE FROM analytics.conversions WHERE org_id = 'org_demo';
DELETE FROM analytics.touchpoints WHERE org_id = 'org_demo';
DELETE FROM analytics.events WHERE org_id = 'org_demo';
DELETE FROM analytics.identities WHERE org_id = 'org_demo';
DELETE FROM analytics.sessions WHERE org_id = 'org_demo';
DELETE FROM analytics.leads WHERE org_id = 'org_demo';
DELETE FROM analytics.campaigns WHERE org_id = 'org_demo';
DELETE FROM analytics.sources WHERE org_id = 'org_demo';
DELETE FROM analytics.integrations WHERE org_id = 'org_demo';

-- Sources
INSERT INTO analytics.sources (id, org_id, name, channel) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'org_demo', 'google', 'paid_search'),
  ('a1000001-0000-4000-8000-000000000002', 'org_demo', 'facebook', 'paid_social'),
  ('a1000001-0000-4000-8000-000000000003', 'org_demo', 'tiktok', 'paid_social');

-- Campaigns (5)
INSERT INTO analytics.campaigns (id, org_id, source_id, name, platform, external_id) VALUES
  ('b2000001-0000-4000-8000-000000000001', 'org_demo', 'a1000001-0000-4000-8000-000000000001', 'cna-enrollment-spring', 'google', 'camp_g_001'),
  ('b2000001-0000-4000-8000-000000000002', 'org_demo', 'a1000001-0000-4000-8000-000000000001', 'cna-enrollment-summer', 'google', 'camp_g_002'),
  ('b2000001-0000-4000-8000-000000000003', 'org_demo', 'a1000001-0000-4000-8000-000000000002', 'cna-leads-meta', 'meta', 'camp_m_001'),
  ('b2000001-0000-4000-8000-000000000004', 'org_demo', 'a1000001-0000-4000-8000-000000000002', 'cna-retargeting', 'meta', 'camp_m_002'),
  ('b2000001-0000-4000-8000-000000000005', 'org_demo', 'a1000001-0000-4000-8000-000000000003', 'cna-tiktok-gen-z', 'tiktok', 'camp_t_001');

-- Integration
INSERT INTO analytics.integrations (org_id, integration_type, jitsu_workspace_id, config, status) VALUES
  ('org_demo', 'jitsu', 'ws_demo', '{"write_key": "demo_key"}', 'active');

-- Ad spend (30 days, 3 platforms, 5 campaigns)
INSERT INTO analytics.ad_spend_daily (org_id, platform, campaign_id, campaign_name, spend, impressions, clicks, date) VALUES
  ('org_demo', 'google', 'camp_g_001', 'cna-enrollment-spring', 450.00, 12000, 380, '2026-05-01'),
  ('org_demo', 'google', 'camp_g_001', 'cna-enrollment-spring', 520.00, 14000, 420, '2026-05-15'),
  ('org_demo', 'google', 'camp_g_002', 'cna-enrollment-summer', 380.00, 9500, 290, '2026-05-01'),
  ('org_demo', 'google', 'camp_g_002', 'cna-enrollment-summer', 410.00, 10200, 310, '2026-05-15'),
  ('org_demo', 'meta', 'camp_m_001', 'cna-leads-meta', 600.00, 45000, 890, '2026-05-01'),
  ('org_demo', 'meta', 'camp_m_001', 'cna-leads-meta', 720.00, 52000, 1050, '2026-05-15'),
  ('org_demo', 'meta', 'camp_m_002', 'cna-retargeting', 280.00, 18000, 420, '2026-05-01'),
  ('org_demo', 'meta', 'camp_m_002', 'cna-retargeting', 310.00, 19500, 460, '2026-05-15'),
  ('org_demo', 'tiktok', 'camp_t_001', 'cna-tiktok-gen-z', 350.00, 85000, 1200, '2026-05-01'),
  ('org_demo', 'tiktok', 'camp_t_001', 'cna-tiktok-gen-z', 390.00, 92000, 1350, '2026-05-15');

-- Leads (20) with touchpoints and some conversions
DO $$
DECLARE
  v_lead_id UUID;
  v_anon TEXT;
  v_campaigns TEXT[][] := ARRAY[
    ARRAY['google', 'cpc', 'cna-enrollment-spring', 'gclid_g1'],
    ARRAY['google', 'cpc', 'cna-enrollment-summer', 'gclid_g2'],
    ARRAY['facebook', 'cpc', 'cna-leads-meta', 'fbclid_m1'],
    ARRAY['facebook', 'cpc', 'cna-retargeting', 'fbclid_m2'],
    ARRAY['tiktok', 'cpc', 'cna-tiktok-gen-z', 'ttclid_t1']
  ];
  v_platforms TEXT[] := ARRAY['google', 'meta', 'meta', 'tiktok', 'google'];
  i INT;
  j INT;
  v_camp_idx INT;
  v_first_at TIMESTAMPTZ;
  v_booked BOOLEAN;
  v_converted BOOLEAN;
  v_revenue NUMERIC;
BEGIN
  FOR i IN 1..20 LOOP
    v_lead_id := gen_random_uuid();
    v_anon := 'anon_demo_' || i;
    v_camp_idx := 1 + ((i - 1) % 5);
    v_first_at := '2026-05-01'::timestamptz + ((i * 2) || ' days')::interval;
    v_booked := i <= 10;
    v_converted := i <= 5;
    v_revenue := CASE i
      WHEN 1 THEN 8500.00
      WHEN 2 THEN 7200.00
      WHEN 3 THEN 9100.00
      WHEN 4 THEN 6800.00
      WHEN 5 THEN 10500.00
      ELSE 0
    END;

    INSERT INTO analytics.leads (id, org_id, email, phone, name, anonymous_id, first_seen_at, status, utm_source, utm_medium, utm_campaign)
    VALUES (
      v_lead_id, 'org_demo',
      'lead' || i || '@demo.school.edu',
      '+1555000' || lpad(i::text, 4, '0'),
      'Demo Lead ' || i,
      v_anon,
      v_first_at,
      CASE WHEN v_converted THEN 'converted' WHEN v_booked THEN 'booked' ELSE 'new' END,
      v_campaigns[v_camp_idx][1],
      v_campaigns[v_camp_idx][2],
      v_campaigns[v_camp_idx][3]
    );

    INSERT INTO analytics.identities (org_id, anonymous_id, lead_id)
    VALUES ('org_demo', v_anon, v_lead_id);

    -- First touchpoint (primary campaign)
    INSERT INTO analytics.touchpoints (
      org_id, lead_id, anonymous_id, source, medium, campaign,
      ad_platform, click_id, click_id_type, landing_page, occurred_at
    ) VALUES (
      'org_demo', v_lead_id, v_anon,
      v_campaigns[v_camp_idx][1], v_campaigns[v_camp_idx][2], v_campaigns[v_camp_idx][3],
      v_platforms[v_camp_idx],
      v_campaigns[v_camp_idx][4] || '_' || i,
      CASE v_platforms[v_camp_idx]
        WHEN 'google' THEN 'gclid' WHEN 'meta' THEN 'fbclid' WHEN 'tiktok' THEN 'ttclid' END,
      '/landing/cna-program',
      v_first_at
    );

    -- Second touchpoint for multi-touch leads (1-10)
    IF i <= 10 THEN
      j := 1 + (i % 4);
      INSERT INTO analytics.touchpoints (
        org_id, lead_id, anonymous_id, source, medium, campaign,
        ad_platform, landing_page, occurred_at
      ) VALUES (
        'org_demo', v_lead_id, v_anon,
        v_campaigns[j][1], v_campaigns[j][2], v_campaigns[j][3],
        v_platforms[j],
        '/pricing',
        v_first_at + '3 days'::interval
      );
    END IF;

    -- Conversion for first 5 leads
    IF v_converted THEN
      INSERT INTO analytics.conversions (org_id, lead_id, conversion_type, revenue_amount, occurred_at, payment_id)
      VALUES (
        'org_demo', v_lead_id, 'payment_completed', v_revenue,
        v_first_at + '14 days'::interval,
        'pi_demo_' || i
      );
    END IF;
  END LOOP;
END $$;

-- Run attribution models on seed data
SELECT analytics.run_first_touch_attribution('org_demo', 90);
SELECT analytics.run_last_touch_attribution('org_demo', 90);
SELECT analytics.run_linear_attribution('org_demo', 90);
