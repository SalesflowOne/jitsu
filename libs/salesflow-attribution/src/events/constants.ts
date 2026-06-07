export const TRACKING_EVENTS = [
  "page_view",
  "landing_page_view",
  "form_submit",
  "call_click",
  "booking_created",
  "lead_created",
  "payment_completed",
  "deal_closed_won",
  "refund_created",
  "subscription_started",
  "subscription_renewed",
  "subscription_cancelled",
] as const;

export type TrackingEventName = (typeof TRACKING_EVENTS)[number];

export const CONVERSION_EVENTS: TrackingEventName[] = [
  "payment_completed",
  "deal_closed_won",
  "subscription_started",
  "subscription_renewed",
];

export const LEAD_EVENTS: TrackingEventName[] = ["form_submit", "lead_created", "booking_created"];

export const CLICK_IDS = ["gclid", "fbclid", "ttclid", "msclkid", "dclid", "twclid", "wbraid"] as const;

export type ClickIdType = (typeof CLICK_IDS)[number];

export const ATTRIBUTION_MODELS = {
  first_touch_v1: "first_touch_v1",
  last_touch_v1: "last_touch_v1",
  linear_v1: "linear_v1",
  u_shaped_v1: "u_shaped_v1",
  time_decay_v1: "time_decay_v1",
  position_based_v1: "position_based_v1",
} as const;

export type AttributionModelName = (typeof ATTRIBUTION_MODELS)[keyof typeof ATTRIBUTION_MODELS];
