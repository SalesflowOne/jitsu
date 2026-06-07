-- Salesflow Attribution: analytics schema
-- Apply to Supabase PostgreSQL (or any Postgres 14+)

CREATE SCHEMA IF NOT EXISTS analytics;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: resolve org_id from JWT (Clerk)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.current_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'org_id',
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'orgId',
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- analytics.sources
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  channel     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX idx_sources_org ON analytics.sources (org_id);

-- ---------------------------------------------------------------------------
-- analytics.campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  source_id       UUID REFERENCES analytics.sources (id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  platform        TEXT,
  external_id     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, name)
);

CREATE INDEX idx_campaigns_org ON analytics.campaigns (org_id);
CREATE INDEX idx_campaigns_platform ON analytics.campaigns (org_id, platform);

-- ---------------------------------------------------------------------------
-- analytics.leads
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  name            TEXT,
  anonymous_id    TEXT,
  first_seen_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'new',
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  crm_id          TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_leads_org ON analytics.leads (org_id);
CREATE INDEX idx_leads_email ON analytics.leads (org_id, email);
CREATE UNIQUE INDEX idx_leads_org_email ON analytics.leads (org_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON analytics.leads (org_id, phone);
CREATE INDEX idx_leads_anonymous ON analytics.leads (org_id, anonymous_id);
CREATE INDEX idx_leads_status ON analytics.leads (org_id, status);

-- ---------------------------------------------------------------------------
-- analytics.sessions
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.sessions (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL,
  anonymous_id    TEXT,
  lead_id         UUID REFERENCES analytics.leads (id) ON DELETE SET NULL,
  landing_page    TEXT,
  referrer        TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  gclid           TEXT,
  fbclid          TEXT,
  ttclid          TEXT,
  msclkid         TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  event_count     INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sessions_org ON analytics.sessions (org_id);
CREATE INDEX idx_sessions_anonymous ON analytics.sessions (org_id, anonymous_id);
CREATE INDEX idx_sessions_lead ON analytics.sessions (org_id, lead_id);

-- ---------------------------------------------------------------------------
-- analytics.events
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  anonymous_id    TEXT,
  user_id         TEXT,
  lead_id         UUID REFERENCES analytics.leads (id) ON DELETE SET NULL,
  session_id      TEXT,
  event_name      TEXT NOT NULL,
  event_type      TEXT,
  source          TEXT NOT NULL DEFAULT 'api',
  url             TEXT,
  referrer        TEXT,
  landing_page    TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  gclid           TEXT,
  fbclid          TEXT,
  ttclid          TEXT,
  msclkid         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  message_id      TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_org ON analytics.events (org_id);
CREATE INDEX idx_events_lead ON analytics.events (org_id, lead_id);
CREATE INDEX idx_events_anonymous ON analytics.events (org_id, anonymous_id);
CREATE INDEX idx_events_session ON analytics.events (org_id, session_id);
CREATE INDEX idx_events_occurred ON analytics.events (org_id, occurred_at DESC);
CREATE INDEX idx_events_name ON analytics.events (org_id, event_name);
CREATE INDEX idx_events_gclid ON analytics.events (org_id, gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_events_fbclid ON analytics.events (org_id, fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_events_ttclid ON analytics.events (org_id, ttclid) WHERE ttclid IS NOT NULL;
CREATE INDEX idx_events_msclkid ON analytics.events (org_id, msclkid) WHERE msclkid IS NOT NULL;
CREATE UNIQUE INDEX idx_events_message_id ON analytics.events (org_id, message_id) WHERE message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- analytics.identities
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.identities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  anonymous_id    TEXT NOT NULL,
  user_id         TEXT,
  lead_id         UUID REFERENCES analytics.leads (id) ON DELETE CASCADE,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}',
  UNIQUE (org_id, anonymous_id)
);

CREATE INDEX idx_identities_org ON analytics.identities (org_id);
CREATE INDEX idx_identities_lead ON analytics.identities (org_id, lead_id);
CREATE INDEX idx_identities_user ON analytics.identities (org_id, user_id);

-- ---------------------------------------------------------------------------
-- analytics.touchpoints
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.touchpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  lead_id         UUID REFERENCES analytics.leads (id) ON DELETE SET NULL,
  anonymous_id    TEXT,
  session_id      TEXT,
  channel         TEXT,
  source          TEXT,
  medium          TEXT,
  campaign        TEXT,
  content         TEXT,
  term            TEXT,
  ad_platform     TEXT,
  ad_account_id   TEXT,
  campaign_id     TEXT,
  adset_id        TEXT,
  ad_id           TEXT,
  creative_id     TEXT,
  click_id        TEXT,
  click_id_type   TEXT,
  landing_page    TEXT,
  referrer        TEXT,
  event_id        UUID REFERENCES analytics.events (id) ON DELETE SET NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_touchpoints_org ON analytics.touchpoints (org_id);
CREATE INDEX idx_touchpoints_lead ON analytics.touchpoints (org_id, lead_id);
CREATE INDEX idx_touchpoints_anonymous ON analytics.touchpoints (org_id, anonymous_id);
CREATE INDEX idx_touchpoints_occurred ON analytics.touchpoints (org_id, occurred_at DESC);
CREATE INDEX idx_touchpoints_campaign ON analytics.touchpoints (org_id, campaign);
CREATE INDEX idx_touchpoints_platform ON analytics.touchpoints (org_id, ad_platform);
CREATE INDEX idx_touchpoints_click ON analytics.touchpoints (org_id, click_id) WHERE click_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- analytics.conversions
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  lead_id         UUID REFERENCES analytics.leads (id) ON DELETE SET NULL,
  conversion_type TEXT NOT NULL,
  revenue_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'completed',
  payment_id      TEXT,
  crm_deal_id     TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversions_org ON analytics.conversions (org_id);
CREATE INDEX idx_conversions_lead ON analytics.conversions (org_id, lead_id);
CREATE INDEX idx_conversions_occurred ON analytics.conversions (org_id, occurred_at DESC);
CREATE INDEX idx_conversions_type ON analytics.conversions (org_id, conversion_type);
CREATE UNIQUE INDEX idx_conversions_payment ON analytics.conversions (org_id, payment_id) WHERE payment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- analytics.ad_spend_daily
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.ad_spend_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  platform        TEXT NOT NULL,
  ad_account_id   TEXT,
  campaign_id     TEXT,
  campaign_name   TEXT,
  adset_id        TEXT,
  adset_name      TEXT,
  ad_id           TEXT,
  ad_name         TEXT,
  spend           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  date            DATE NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, campaign_id, ad_id, date)
);

CREATE INDEX idx_ad_spend_org ON analytics.ad_spend_daily (org_id);
CREATE INDEX idx_ad_spend_date ON analytics.ad_spend_daily (org_id, date DESC);
CREATE INDEX idx_ad_spend_campaign ON analytics.ad_spend_daily (org_id, campaign_name);
CREATE INDEX idx_ad_spend_platform ON analytics.ad_spend_daily (org_id, platform);

-- ---------------------------------------------------------------------------
-- analytics.attribution_runs
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.attribution_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  model_name      TEXT NOT NULL,
  lookback_days   INT NOT NULL DEFAULT 90,
  config          JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attribution_runs_org ON analytics.attribution_runs (org_id);
CREATE INDEX idx_attribution_runs_model ON analytics.attribution_runs (org_id, model_name);

-- ---------------------------------------------------------------------------
-- analytics.attribution_results
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.attribution_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL,
  run_id              UUID NOT NULL REFERENCES analytics.attribution_runs (id) ON DELETE CASCADE,
  conversion_id       UUID NOT NULL REFERENCES analytics.conversions (id) ON DELETE CASCADE,
  lead_id             UUID REFERENCES analytics.leads (id) ON DELETE SET NULL,
  touchpoint_id       UUID REFERENCES analytics.touchpoints (id) ON DELETE SET NULL,
  model_name          TEXT NOT NULL,
  attributed_revenue  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  attribution_weight  NUMERIC(7, 6) NOT NULL DEFAULT 0,
  source              TEXT,
  campaign            TEXT,
  ad_platform         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attribution_results_org ON analytics.attribution_results (org_id);
CREATE INDEX idx_attribution_results_run ON analytics.attribution_results (run_id);
CREATE INDEX idx_attribution_results_conversion ON analytics.attribution_results (conversion_id);
CREATE INDEX idx_attribution_results_campaign ON analytics.attribution_results (org_id, campaign);

-- ---------------------------------------------------------------------------
-- analytics.tracking_links
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.tracking_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  slug            TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  clicks          BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_tracking_links_org ON analytics.tracking_links (org_id);

-- ---------------------------------------------------------------------------
-- analytics.integrations
-- ---------------------------------------------------------------------------
CREATE TABLE analytics.integrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              TEXT NOT NULL,
  integration_type    TEXT NOT NULL,
  jitsu_workspace_id  TEXT,
  config              JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integrations_org ON analytics.integrations (org_id);
CREATE INDEX idx_integrations_jitsu ON analytics.integrations (jitsu_workspace_id) WHERE jitsu_workspace_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE analytics.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.ad_spend_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.attribution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.attribution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.integrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sources', 'campaigns', 'leads', 'sessions', 'events', 'identities',
    'touchpoints', 'conversions', 'ad_spend_daily', 'attribution_runs',
    'attribution_results', 'tracking_links', 'integrations'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY org_isolation_select ON analytics.%I FOR SELECT USING (org_id = analytics.current_org_id())',
      t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_insert ON analytics.%I FOR INSERT WITH CHECK (org_id = analytics.current_org_id())',
      t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_update ON analytics.%I FOR UPDATE USING (org_id = analytics.current_org_id())',
      t
    );
    EXECUTE format(
      'CREATE POLICY org_isolation_delete ON analytics.%I FOR DELETE USING (org_id = analytics.current_org_id())',
      t
    );
  END LOOP;
END $$;

-- Service role bypasses RLS by default in Supabase

-- ---------------------------------------------------------------------------
-- Helper: infer ad platform from click ID or UTM source
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.infer_ad_platform(
  p_gclid TEXT, p_fbclid TEXT, p_ttclid TEXT, p_msclkid TEXT, p_source TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_gclid IS NOT NULL THEN 'google'
    WHEN p_fbclid IS NOT NULL THEN 'meta'
    WHEN p_ttclid IS NOT NULL THEN 'tiktok'
    WHEN p_msclkid IS NOT NULL THEN 'microsoft'
    WHEN lower(coalesce(p_source, '')) IN ('google', 'googleads', 'google_ads') THEN 'google'
    WHEN lower(coalesce(p_source, '')) IN ('facebook', 'meta', 'instagram', 'fb') THEN 'meta'
    WHEN lower(coalesce(p_source, '')) IN ('tiktok', 'tt') THEN 'tiktok'
    WHEN lower(coalesce(p_source, '')) IN ('bing', 'microsoft') THEN 'microsoft'
    WHEN p_source IS NOT NULL AND p_source <> '' THEN 'other'
    ELSE 'direct'
  END;
$$;
