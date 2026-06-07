import type { AnalyticsServerEvent } from "@jitsu/protocols/analytics";
import { CLICK_IDS, CONVERSION_EVENTS, LEAD_EVENTS } from "./constants";
import type { ConversionUpsert, IngestResult, LeadUpsert, NormalizedEvent, TouchpointInsert } from "./types";

type CampaignContext = {
  source?: string;
  medium?: string;
  name?: string;
  content?: string;
  term?: string;
};

function parseQueryParams(url?: string): Record<string, string> {
  if (!url) return {};
  try {
    const u = new URL(url);
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return {};
  }
}

function extractClickIds(props: Record<string, unknown>, url?: string): Record<string, string | undefined> {
  const query = parseQueryParams(url);
  const result: Record<string, string | undefined> = {};
  for (const key of CLICK_IDS) {
    const val = props[key] ?? query[key];
    if (typeof val === "string" && val.length > 0) {
      result[key] = val;
    }
  }
  return result;
}

function inferAdPlatform(clickIds: Record<string, string | undefined>, source?: string): string | undefined {
  if (clickIds.gclid) return "google";
  if (clickIds.fbclid) return "meta";
  if (clickIds.ttclid) return "tiktok";
  if (clickIds.msclkid) return "microsoft";
  const s = (source ?? "").toLowerCase();
  if (["google", "googleads", "google_ads"].includes(s)) return "google";
  if (["facebook", "meta", "instagram", "fb"].includes(s)) return "meta";
  if (["tiktok", "tt"].includes(s)) return "tiktok";
  if (["bing", "microsoft"].includes(s)) return "microsoft";
  if (source) return "other";
  return undefined;
}

function resolveEventName(jitsuEvent: AnalyticsServerEvent): string {
  if (jitsuEvent.type === "page") return "page_view";
  if (jitsuEvent.type === "identify") return "lead_created";
  if (jitsuEvent.type === "track" && jitsuEvent.event) return jitsuEvent.event;
  return jitsuEvent.type ?? "unknown";
}

function resolveOccurredAt(jitsuEvent: AnalyticsServerEvent): string {
  const ts = jitsuEvent.timestamp ?? jitsuEvent.receivedAt;
  if (ts) return new Date(ts).toISOString();
  return new Date().toISOString();
}

export function mapJitsuEvent(orgId: string, jitsuEvent: AnalyticsServerEvent, source = "jitsu"): IngestResult {
  const props = (jitsuEvent.properties ?? {}) as Record<string, unknown>;
  const campaign = (jitsuEvent.context?.campaign ?? {}) as CampaignContext;
  const page = jitsuEvent.context?.page;
  const url = (props.url as string) ?? page?.url;
  const clickIds = extractClickIds(props, url);

  const eventName = resolveEventName(jitsuEvent);
  const utmSource = campaign.source ?? (props.utm_source as string);
  const utmMedium = campaign.medium ?? (props.utm_medium as string);
  const utmCampaign = campaign.name ?? (props.utm_campaign as string);

  const event: NormalizedEvent = {
    org_id: orgId,
    anonymous_id: jitsuEvent.anonymousId ?? undefined,
    user_id: jitsuEvent.userId ?? undefined,
    session_id: (props.session_id as string) ?? undefined,
    event_name: eventName,
    event_type: jitsuEvent.type,
    source,
    url,
    referrer: page?.referrer ?? (props.referrer as string),
    landing_page: (props.landing_page as string) ?? url,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: campaign.content ?? (props.utm_content as string),
    utm_term: campaign.term ?? (props.utm_term as string),
    gclid: clickIds.gclid,
    fbclid: clickIds.fbclid,
    ttclid: clickIds.ttclid,
    msclkid: clickIds.msclkid,
    metadata: { raw: jitsuEvent },
    message_id: jitsuEvent.messageId,
    occurred_at: resolveOccurredAt(jitsuEvent),
  };

  const result: IngestResult = { event };

  const hasAttributionSignal = !!(
    utmSource ||
    utmCampaign ||
    clickIds.gclid ||
    clickIds.fbclid ||
    clickIds.ttclid ||
    clickIds.msclkid
  );
  if (
    hasAttributionSignal &&
    (eventName === "page_view" || eventName === "landing_page_view" || LEAD_EVENTS.includes(eventName as any))
  ) {
    const clickIdEntry = CLICK_IDS.map(k => ({ type: k, val: clickIds[k] })).find(e => e.val);
    result.touchpoint = {
      org_id: orgId,
      anonymous_id: event.anonymous_id,
      session_id: event.session_id,
      source: utmSource,
      medium: utmMedium,
      campaign: utmCampaign,
      content: event.utm_content,
      term: event.utm_term,
      ad_platform: inferAdPlatform(clickIds, utmSource),
      click_id: clickIdEntry?.val,
      click_id_type: clickIdEntry?.type,
      landing_page: event.landing_page,
      referrer: event.referrer,
      occurred_at: event.occurred_at,
    };
  }

  if (LEAD_EVENTS.includes(eventName as any) || jitsuEvent.type === "identify") {
    const traits = (jitsuEvent.traits ?? props) as Record<string, unknown>;
    const email = (traits.email ?? props.email) as string | undefined;
    const phone = (traits.phone ?? props.phone) as string | undefined;
    const name = (traits.name ?? props.name) as string | undefined;

    if (email || phone || jitsuEvent.userId) {
      result.lead = {
        org_id: orgId,
        email,
        phone,
        name,
        anonymous_id: event.anonymous_id,
        status: eventName === "booking_created" ? "booked" : "new",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        crm_id: (props.crm_id as string) ?? undefined,
        metadata: traits,
      };
    }
  } else if (CONVERSION_EVENTS.includes(eventName as any)) {
    const email = props.email as string | undefined;
    const phone = props.phone as string | undefined;
    const name = props.name as string | undefined;
    if (email || phone) {
      result.lead = {
        org_id: orgId,
        email,
        phone,
        name,
        anonymous_id: event.anonymous_id,
        status: "converted",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        metadata: props,
      };
    }
  }

  if (CONVERSION_EVENTS.includes(eventName as any)) {
    const revenue = Number(props.revenue_amount ?? props.revenue ?? props.amount ?? props.value ?? 0);
    result.conversion = {
      org_id: orgId,
      conversion_type: eventName,
      revenue_amount: isNaN(revenue) ? 0 : revenue,
      currency: (props.currency as string) ?? "USD",
      status: eventName === "refund_created" ? "refunded" : "completed",
      payment_id: (props.payment_id as string) ?? undefined,
      crm_deal_id: (props.crm_deal_id as string) ?? undefined,
      occurred_at: event.occurred_at,
      metadata: props,
    };
  }

  return result;
}

export function hasAttributionSignals(event: NormalizedEvent): boolean {
  return !!(event.utm_source || event.utm_campaign || event.gclid || event.fbclid || event.ttclid || event.msclkid);
}
