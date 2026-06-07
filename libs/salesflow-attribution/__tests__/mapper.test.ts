import { describe, expect, it } from "vitest";
import { mapJitsuEvent } from "../src/events/mapper";

describe("mapJitsuEvent", () => {
  it("maps page view with UTMs and gclid", () => {
    const result = mapJitsuEvent("org_test", {
      type: "page",
      anonymousId: "anon_1",
      timestamp: "2026-06-07T12:00:00.000Z",
      messageId: "msg_1",
      context: {
        campaign: { source: "google", medium: "cpc", name: "spring-campaign" },
        page: { url: "https://example.com/landing?gclid=abc123", referrer: "https://google.com" },
      },
      properties: { url: "https://example.com/landing?gclid=abc123" },
    });

    expect(result.event.event_name).toBe("page_view");
    expect(result.event.utm_source).toBe("google");
    expect(result.event.gclid).toBe("abc123");
    expect(result.touchpoint?.ad_platform).toBe("google");
    expect(result.touchpoint?.click_id).toBe("abc123");
  });

  it("creates lead and conversion on payment_completed", () => {
    const result = mapJitsuEvent("org_test", {
      type: "track",
      event: "payment_completed",
      anonymousId: "anon_2",
      userId: "user_2",
      timestamp: "2026-06-07T12:00:00.000Z",
      properties: {
        email: "buyer@example.com",
        revenue_amount: 4999,
        payment_id: "pi_123",
      },
    });

    expect(result.event.event_name).toBe("payment_completed");
    expect(result.lead?.email).toBe("buyer@example.com");
    expect(result.conversion?.revenue_amount).toBe(4999);
    expect(result.conversion?.payment_id).toBe("pi_123");
  });

  it("maps form_submit to lead with touchpoint when UTMs present", () => {
    const result = mapJitsuEvent("org_test", {
      type: "track",
      event: "form_submit",
      anonymousId: "anon_3",
      timestamp: "2026-06-07T12:00:00.000Z",
      context: {
        campaign: { source: "facebook", medium: "cpc", name: "meta-leads" },
      },
      properties: {
        email: "lead@example.com",
        name: "Jane Doe",
        url: "https://example.com/form?fbclid=xyz789",
        fbclid: "xyz789",
      },
    });

    expect(result.lead?.email).toBe("lead@example.com");
    expect(result.touchpoint?.ad_platform).toBe("meta");
    expect(result.touchpoint?.click_id_type).toBe("fbclid");
  });
});
