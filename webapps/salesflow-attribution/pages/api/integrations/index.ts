import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery, getDb, getOrgId } from "@/lib/db";
import { resolveApiOrgId } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let orgId = getOrgId();
  try {
    orgId = await resolveApiOrgId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!getDb()) return res.status(503).json({ error: "Database not configured" });

  if (req.method === "GET") {
    const rows = await dbQuery(
      `SELECT id, integration_type, jitsu_workspace_id, config, status, created_at, updated_at
       FROM analytics.integrations WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    return res.status(200).json({ integrations: rows });
  }

  if (req.method === "POST") {
    const { integration_type, jitsu_workspace_id, config } = req.body as {
      integration_type?: string;
      jitsu_workspace_id?: string;
      config?: Record<string, unknown>;
    };

    if (!integration_type) return res.status(400).json({ error: "integration_type is required" });

    await dbQuery(
      `INSERT INTO analytics.integrations (org_id, integration_type, jitsu_workspace_id, config, status, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, 'active', now())
       ON CONFLICT (org_id, integration_type) DO UPDATE SET
         jitsu_workspace_id = coalesce(EXCLUDED.jitsu_workspace_id, analytics.integrations.jitsu_workspace_id),
         config = analytics.integrations.config || EXCLUDED.config,
         status = 'active',
         updated_at = now()`,
      [orgId, integration_type, jitsu_workspace_id ?? null, JSON.stringify(config ?? {})]
    );

    return res.status(200).json({ status: "ok" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
