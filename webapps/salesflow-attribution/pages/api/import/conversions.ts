import type { NextApiRequest, NextApiResponse } from "next";
import { parseConversionsCsv, persistConversionCsvRows } from "@salesflow/attribution-core";
import { getDb, getOrgId } from "@/lib/db";
import { resolveApiOrgId } from "@/lib/auth-server";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let orgId = getOrgId();
  try {
    orgId = await resolveApiOrgId(req);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = getDb();
  if (!db) return res.status(503).json({ error: "Database not configured" });

  const { csv } = req.body as { csv?: string };
  if (!csv) return res.status(400).json({ error: "csv field is required" });

  const dbClient = {
    query: async (sql: string, params?: unknown[]) => {
      const r = await db.query(sql, params);
      return { rows: r.rows as Record<string, unknown>[] };
    },
  };

  try {
    const rows = parseConversionsCsv(orgId, csv);
    const count = await persistConversionCsvRows(dbClient, rows);
    return res.status(200).json({ status: "ok", imported: count });
  } catch (err: unknown) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Import failed" });
  }
}
