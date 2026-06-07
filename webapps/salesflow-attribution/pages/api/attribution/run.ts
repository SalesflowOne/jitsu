import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery, getOrgId } from "@/lib/db";

const MODEL_FUNCTIONS: Record<string, string> = {
  first_touch_v1: "analytics.run_first_touch_attribution",
  last_touch_v1: "analytics.run_last_touch_attribution",
  linear_v1: "analytics.run_linear_attribution",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const model = (req.body?.model as string) ?? "first_touch_v1";
  const lookbackDays = Number(req.body?.lookback_days ?? 90);
  const orgId = (req.body?.org_id as string) ?? getOrgId();

  const fn = MODEL_FUNCTIONS[model];
  if (!fn) {
    return res.status(400).json({ error: `Unknown model: ${model}` });
  }

  try {
    const rows = await dbQuery<{ [key: string]: string }>(`SELECT ${fn}($1, $2) as run_id`, [orgId, lookbackDays]);

    if (rows.length === 0) {
      return res.status(503).json({ error: "Database not configured" });
    }

    return res.status(200).json({
      status: "ok",
      run_id: rows[0].run_id,
      model,
      lookback_days: lookbackDays,
      org_id: orgId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
