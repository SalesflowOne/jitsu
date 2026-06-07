import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery, getDb, getOrgId } from "@/lib/db";
import { resolveApiOrgId } from "@/lib/auth-server";

const MODEL_FUNCTIONS: Record<
  string,
  { sql: string; params: (orgId: string, lookback: number, halfLife?: number) => unknown[] }
> = {
  first_touch_v1: { sql: "SELECT analytics.run_first_touch_attribution($1, $2) as run_id", params: (o, l) => [o, l] },
  last_touch_v1: { sql: "SELECT analytics.run_last_touch_attribution($1, $2) as run_id", params: (o, l) => [o, l] },
  linear_v1: { sql: "SELECT analytics.run_linear_attribution($1, $2) as run_id", params: (o, l) => [o, l] },
  u_shaped_v1: { sql: "SELECT analytics.run_u_shaped_attribution($1, $2) as run_id", params: (o, l) => [o, l] },
  time_decay_v1: {
    sql: "SELECT analytics.run_time_decay_attribution($1, $2, $3) as run_id",
    params: (o, l, h) => [o, l, h ?? 7],
  },
  position_based_v1: {
    sql: "SELECT analytics.run_position_based_attribution($1, $2) as run_id",
    params: (o, l) => [o, l],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let orgId = (req.body?.org_id as string) ?? getOrgId();
  try {
    orgId = await resolveApiOrgId(req, orgId);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!getDb()) return res.status(503).json({ error: "Database not configured" });

  const model = (req.body?.model as string) ?? "first_touch_v1";
  const lookbackDays = Number(req.body?.lookback_days ?? 90);
  const halfLifeDays = Number(req.body?.half_life_days ?? 7);
  const runAll = req.body?.run_all === true;

  try {
    if (runAll) {
      const runIds: Record<string, string> = {};
      for (const [name, fn] of Object.entries(MODEL_FUNCTIONS)) {
        const rows = await dbQuery<{ run_id: string }>(fn.sql, fn.params(orgId, lookbackDays, halfLifeDays));
        if (rows[0]?.run_id) runIds[name] = rows[0].run_id;
      }
      return res.status(200).json({ status: "ok", org_id: orgId, run_ids: runIds });
    }

    const fn = MODEL_FUNCTIONS[model];
    if (!fn) return res.status(400).json({ error: `Unknown model: ${model}` });

    const rows = await dbQuery<{ run_id: string }>(fn.sql, fn.params(orgId, lookbackDays, halfLifeDays));
    return res.status(200).json({
      status: "ok",
      run_id: rows[0]?.run_id,
      model,
      lookback_days: lookbackDays,
      org_id: orgId,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
