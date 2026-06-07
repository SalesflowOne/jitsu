import type { AnalyticsServerEvent } from "@jitsu/protocols/analytics";
import { mapJitsuEvent } from "../events/mapper";
import type { IngestPayload, IngestResult } from "../events/types";
import { IngestPayloadSchema } from "../events/types";

export type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export function parseIngestPayload(body: unknown): IngestPayload {
  return IngestPayloadSchema.parse(body);
}

export function processIngestPayload(payload: IngestPayload): IngestResult {
  const jitsuEvent = payload.event as AnalyticsServerEvent;
  return mapJitsuEvent(payload.org_id, jitsuEvent, payload.source);
}

/**
 * Persists a normalized ingest result to Supabase/Postgres analytics schema.
 * Uses parameterized queries — caller provides a pg-compatible client.
 */
export async function persistIngestResult(
  db: DbClient,
  result: IngestResult
): Promise<{
  event_id: string;
  lead_id?: string;
  touchpoint_id?: string;
  conversion_id?: string;
}> {
  let leadId = result.event.lead_id;

  // Upsert lead
  if (result.lead) {
    const leadRows = await db.query(
      `INSERT INTO analytics.leads (org_id, email, phone, name, anonymous_id, first_seen_at, status, utm_source, utm_medium, utm_campaign, crm_id, metadata)
       VALUES ($1, $2, $3, $4, $5, now(), $6, $7, $8, $9, $10, $11)
       ON CONFLICT (org_id, email) WHERE email IS NOT NULL DO UPDATE SET
         phone = coalesce(EXCLUDED.phone, analytics.leads.phone),
         name = coalesce(EXCLUDED.name, analytics.leads.name),
         status = EXCLUDED.status,
         metadata = analytics.leads.metadata || EXCLUDED.metadata
       RETURNING id`,
      [
        result.lead.org_id,
        result.lead.email ?? null,
        result.lead.phone ?? null,
        result.lead.name ?? null,
        result.lead.anonymous_id ?? null,
        result.lead.status,
        result.lead.utm_source ?? null,
        result.lead.utm_medium ?? null,
        result.lead.utm_campaign ?? null,
        result.lead.crm_id ?? null,
        JSON.stringify(result.lead.metadata),
      ]
    );

    if (leadRows.rows[0]?.id) {
      leadId = leadRows.rows[0].id as string;
    } else if (result.lead.email) {
      const existing = await db.query(`SELECT id FROM analytics.leads WHERE org_id = $1 AND email = $2 LIMIT 1`, [
        result.lead.org_id,
        result.lead.email,
      ]);
      leadId = existing.rows[0]?.id as string | undefined;
    }

    // Link identity
    if (leadId && result.lead.anonymous_id) {
      await db.query(
        `INSERT INTO analytics.identities (org_id, anonymous_id, lead_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_id, anonymous_id) DO UPDATE SET lead_id = EXCLUDED.lead_id`,
        [result.lead.org_id, result.lead.anonymous_id, leadId]
      );
    }
  }

  // Resolve lead from identity if not yet known
  if (!leadId && result.event.anonymous_id) {
    const identity = await db.query(
      `SELECT lead_id FROM analytics.identities WHERE org_id = $1 AND anonymous_id = $2 LIMIT 1`,
      [result.event.org_id, result.event.anonymous_id]
    );
    leadId = identity.rows[0]?.lead_id as string | undefined;
  }

  // Insert event
  const eventRows = await db.query(
    `INSERT INTO analytics.events (
      org_id, anonymous_id, user_id, lead_id, session_id, event_name, event_type, source,
      url, referrer, landing_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      gclid, fbclid, ttclid, msclkid, metadata, message_id, occurred_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    ON CONFLICT (org_id, message_id) WHERE message_id IS NOT NULL DO NOTHING
    RETURNING id`,
    [
      result.event.org_id,
      result.event.anonymous_id ?? null,
      result.event.user_id ?? null,
      leadId ?? null,
      result.event.session_id ?? null,
      result.event.event_name,
      result.event.event_type ?? null,
      result.event.source,
      result.event.url ?? null,
      result.event.referrer ?? null,
      result.event.landing_page ?? null,
      result.event.utm_source ?? null,
      result.event.utm_medium ?? null,
      result.event.utm_campaign ?? null,
      result.event.utm_content ?? null,
      result.event.utm_term ?? null,
      result.event.gclid ?? null,
      result.event.fbclid ?? null,
      result.event.ttclid ?? null,
      result.event.msclkid ?? null,
      JSON.stringify(result.event.metadata),
      result.event.message_id ?? null,
      result.event.occurred_at,
    ]
  );

  const eventId = eventRows.rows[0]?.id as string;

  let touchpointId: string | undefined;
  if (result.touchpoint && eventId) {
    const tp = { ...result.touchpoint, lead_id: leadId };
    const tpRows = await db.query(
      `INSERT INTO analytics.touchpoints (
        org_id, lead_id, anonymous_id, session_id, channel, source, medium, campaign,
        content, term, ad_platform, click_id, click_id_type, landing_page, referrer, event_id, occurred_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id`,
      [
        tp.org_id,
        tp.lead_id ?? null,
        tp.anonymous_id ?? null,
        tp.session_id ?? null,
        tp.channel ?? null,
        tp.source ?? null,
        tp.medium ?? null,
        tp.campaign ?? null,
        tp.content ?? null,
        tp.term ?? null,
        tp.ad_platform ?? null,
        tp.click_id ?? null,
        tp.click_id_type ?? null,
        tp.landing_page ?? null,
        tp.referrer ?? null,
        eventId,
        tp.occurred_at,
      ]
    );
    touchpointId = tpRows.rows[0]?.id as string | undefined;
  }

  let conversionId: string | undefined;
  if (result.conversion) {
    const conv = { ...result.conversion, lead_id: leadId };
    const convRows = await db.query(
      `INSERT INTO analytics.conversions (
        org_id, lead_id, conversion_type, revenue_amount, currency, status, payment_id, crm_deal_id, occurred_at, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (org_id, payment_id) WHERE payment_id IS NOT NULL DO NOTHING
      RETURNING id`,
      [
        conv.org_id,
        conv.lead_id ?? null,
        conv.conversion_type,
        conv.revenue_amount,
        conv.currency,
        conv.status,
        conv.payment_id ?? null,
        conv.crm_deal_id ?? null,
        conv.occurred_at,
        JSON.stringify(conv.metadata),
      ]
    );
    conversionId = convRows.rows[0]?.id as string | undefined;
  }

  return { event_id: eventId, lead_id: leadId, touchpoint_id: touchpointId, conversion_id: conversionId };
}
