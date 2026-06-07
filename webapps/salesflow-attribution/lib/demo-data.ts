// Demo metrics when Supabase is not connected
export const DEMO_OVERVIEW = {
  total_spend: 4810,
  total_leads: 20,
  booked_appointments: 10,
  total_conversions: 5,
  total_revenue: 42100,
  roas: 8.75,
  cost_per_lead: 240.5,
  cost_per_conversion: 962,
  lead_to_close_pct: 25,
};

export const DEMO_CAMPAIGNS = [
  {
    campaign: "cna-enrollment-spring",
    platform: "google",
    spend: 970,
    leads: 4,
    conversions: 1,
    revenue: 8500,
    roas: 8.76,
  },
  {
    campaign: "cna-enrollment-summer",
    platform: "google",
    spend: 790,
    leads: 4,
    conversions: 1,
    revenue: 7200,
    roas: 9.11,
  },
  { campaign: "cna-leads-meta", platform: "meta", spend: 1320, leads: 4, conversions: 1, revenue: 9100, roas: 6.89 },
  { campaign: "cna-retargeting", platform: "meta", spend: 590, leads: 4, conversions: 1, revenue: 6800, roas: 11.53 },
  {
    campaign: "cna-tiktok-gen-z",
    platform: "tiktok",
    spend: 740,
    leads: 4,
    conversions: 1,
    revenue: 10500,
    roas: 14.19,
  },
];

export const DEMO_ATTRIBUTION = [
  { model: "first_touch_v1", campaign: "cna-enrollment-spring", revenue: 16800 },
  { model: "first_touch_v1", campaign: "cna-leads-meta", revenue: 12600 },
  { model: "first_touch_v1", campaign: "cna-tiktok-gen-z", revenue: 10500 },
  { model: "first_touch_v1", campaign: "cna-retargeting", revenue: 2200 },
  { model: "last_touch_v1", campaign: "cna-retargeting", revenue: 15800 },
  { model: "last_touch_v1", campaign: "cna-enrollment-summer", revenue: 10500 },
  { model: "last_touch_v1", campaign: "cna-leads-meta", revenue: 9100 },
  { model: "last_touch_v1", campaign: "cna-enrollment-spring", revenue: 4200 },
  { model: "last_touch_v1", campaign: "cna-tiktok-gen-z", revenue: 2500 },
  { model: "linear_v1", campaign: "cna-enrollment-spring", revenue: 9800 },
  { model: "linear_v1", campaign: "cna-retargeting", revenue: 8900 },
  { model: "linear_v1", campaign: "cna-leads-meta", revenue: 8700 },
  { model: "linear_v1", campaign: "cna-enrollment-summer", revenue: 7800 },
  { model: "linear_v1", campaign: "cna-tiktok-gen-z", revenue: 6900 },
];

export const DEMO_LEADS = [
  {
    id: "1",
    name: "Demo Lead 1",
    email: "lead1@demo.school.edu",
    status: "converted",
    first_touch: "google",
    last_touch: "meta",
    revenue: 8500,
  },
  {
    id: "2",
    name: "Demo Lead 2",
    email: "lead2@demo.school.edu",
    status: "converted",
    first_touch: "google",
    last_touch: "google",
    revenue: 7200,
  },
  {
    id: "3",
    name: "Demo Lead 3",
    email: "lead3@demo.school.edu",
    status: "converted",
    first_touch: "facebook",
    last_touch: "facebook",
    revenue: 9100,
  },
  {
    id: "4",
    name: "Demo Lead 4",
    email: "lead4@demo.school.edu",
    status: "converted",
    first_touch: "facebook",
    last_touch: "google",
    revenue: 6800,
  },
  {
    id: "5",
    name: "Demo Lead 5",
    email: "lead5@demo.school.edu",
    status: "converted",
    first_touch: "tiktok",
    last_touch: "facebook",
    revenue: 10500,
  },
];

export const DEMO_EVENTS = [
  {
    event_name: "page_view",
    utm_source: "google",
    utm_campaign: "cna-enrollment-spring",
    occurred_at: "2026-05-03T10:00:00Z",
  },
  {
    event_name: "form_submit",
    utm_source: "google",
    utm_campaign: "cna-enrollment-spring",
    occurred_at: "2026-05-03T10:05:00Z",
  },
  {
    event_name: "call_click",
    utm_source: "facebook",
    utm_campaign: "cna-leads-meta",
    occurred_at: "2026-05-05T14:00:00Z",
  },
  {
    event_name: "booking_created",
    utm_source: "facebook",
    utm_campaign: "cna-retargeting",
    occurred_at: "2026-05-08T09:00:00Z",
  },
  { event_name: "payment_completed", utm_source: null, utm_campaign: null, occurred_at: "2026-05-17T16:00:00Z" },
];
