export type AdSpendRow = {
  org_id: string;
  platform: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend: number;
  impressions: number;
  clicks: number;
  date: string;
};

export type ConversionCsvRow = {
  org_id: string;
  email?: string;
  conversion_type: string;
  revenue_amount: number;
  currency: string;
  payment_id?: string;
  crm_deal_id?: string;
  occurred_at: string;
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return headers.reduce((acc, h, i) => {
      acc[h] = values[i] ?? "";
      return acc;
    }, {} as Record<string, string>);
  });
}

function num(val: string | undefined, fallback = 0): number {
  const n = parseFloat((val ?? "").replace(/[$,]/g, ""));
  return isNaN(n) ? fallback : n;
}

export function parseAdSpendCsv(orgId: string, content: string, defaultPlatform?: string): AdSpendRow[] {
  return parseCsv(content).map(row => ({
    org_id: orgId,
    platform: row.platform || defaultPlatform || "unknown",
    campaign_id: row.campaign_id || row.campaignid || undefined,
    campaign_name: row.campaign_name || row.campaign || row.campaignname || undefined,
    adset_id: row.adset_id || row.ad_set_id || undefined,
    adset_name: row.adset_name || row.ad_set_name || undefined,
    ad_id: row.ad_id || row.adid || undefined,
    ad_name: row.ad_name || row.adname || undefined,
    spend: num(row.spend || row.cost),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    date: row.date || row.day || new Date().toISOString().slice(0, 10),
  }));
}

export function parseConversionsCsv(orgId: string, content: string): ConversionCsvRow[] {
  return parseCsv(content).map(row => ({
    org_id: orgId,
    email: row.email || undefined,
    conversion_type: row.conversion_type || row.type || "payment_completed",
    revenue_amount: num(row.revenue_amount || row.revenue || row.amount),
    currency: row.currency || "USD",
    payment_id: row.payment_id || row.transaction_id || undefined,
    crm_deal_id: row.crm_deal_id || row.deal_id || undefined,
    occurred_at: row.occurred_at || row.date || row.closed_date || new Date().toISOString(),
  }));
}
