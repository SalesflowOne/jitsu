import { z } from "zod";

export const NormalizedEventSchema = z.object({
  org_id: z.string(),
  anonymous_id: z.string().optional(),
  user_id: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
  event_name: z.string(),
  event_type: z.string().optional(),
  source: z.string().default("api"),
  url: z.string().optional(),
  referrer: z.string().optional(),
  landing_page: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  ttclid: z.string().optional(),
  msclkid: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  message_id: z.string().optional(),
  occurred_at: z.string().datetime({ offset: true }),
});

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

export const LeadUpsertSchema = z.object({
  org_id: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  anonymous_id: z.string().optional(),
  status: z.string().default("new"),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  crm_id: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type LeadUpsert = z.infer<typeof LeadUpsertSchema>;

export const ConversionUpsertSchema = z.object({
  org_id: z.string(),
  lead_id: z.string().uuid().optional(),
  conversion_type: z.string(),
  revenue_amount: z.number().default(0),
  currency: z.string().default("USD"),
  status: z.string().default("completed"),
  payment_id: z.string().optional(),
  crm_deal_id: z.string().optional(),
  occurred_at: z.string().datetime({ offset: true }),
  metadata: z.record(z.unknown()).default({}),
});

export type ConversionUpsert = z.infer<typeof ConversionUpsertSchema>;

export const TouchpointInsertSchema = z.object({
  org_id: z.string(),
  lead_id: z.string().uuid().optional(),
  anonymous_id: z.string().optional(),
  session_id: z.string().optional(),
  channel: z.string().optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  content: z.string().optional(),
  term: z.string().optional(),
  ad_platform: z.string().optional(),
  click_id: z.string().optional(),
  click_id_type: z.string().optional(),
  landing_page: z.string().optional(),
  referrer: z.string().optional(),
  occurred_at: z.string().datetime({ offset: true }),
});

export type TouchpointInsert = z.infer<typeof TouchpointInsertSchema>;

export type IngestResult = {
  event: NormalizedEvent;
  lead?: LeadUpsert & { id?: string };
  touchpoint?: TouchpointInsert;
  conversion?: ConversionUpsert;
};

export const IngestPayloadSchema = z.object({
  org_id: z.string().optional(),
  jitsu_workspace_id: z.string().optional(),
  source: z.enum(["jitsu", "api", "webhook", "csv", "stripe"]).default("api"),
  event: z.record(z.unknown()),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;
