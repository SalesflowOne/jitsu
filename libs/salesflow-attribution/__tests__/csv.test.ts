import { describe, expect, it } from "vitest";
import { parseAdSpendCsv, parseConversionsCsv } from "../src/import/csv";

describe("parseAdSpendCsv", () => {
  it("parses ad spend rows", () => {
    const csv = `date,platform,campaign_name,spend,impressions,clicks
2026-05-01,google,cna-spring,450.00,12000,380`;
    const rows = parseAdSpendCsv("org_test", csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe("google");
    expect(rows[0].campaign_name).toBe("cna-spring");
    expect(rows[0].spend).toBe(450);
  });
});

describe("parseConversionsCsv", () => {
  it("parses conversion rows", () => {
    const csv = `email,revenue_amount,occurred_at,payment_id
buyer@example.com,4999,2026-05-17T16:00:00Z,pi_123`;
    const rows = parseConversionsCsv("org_test", csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("buyer@example.com");
    expect(rows[0].revenue_amount).toBe(4999);
  });
});
