import type { NextApiRequest, NextApiResponse } from "next";
import { parseIngestPayload, persistIngestResult, processIngestPayload } from "@salesflow/attribution-core";
import { getDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  const expectedKey = process.env.SALESFLOW_INGEST_API_KEY ?? "dev-ingest-key";
  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = getDb();
  if (!db) {
    return res.status(503).json({ error: "Database not configured. Set SUPABASE_DATABASE_URL or DATABASE_URL." });
  }

  try {
    const payload = parseIngestPayload(req.body);
    const result = processIngestPayload(payload);

    const dbClient = {
      query: async (sql: string, params?: unknown[]) => {
        const r = await db.query(sql, params);
        return { rows: r.rows as Record<string, unknown>[] };
      },
    };

    const ids = await persistIngestResult(dbClient, result);

    return res.status(200).json({
      status: "ok",
      event_name: result.event.event_name,
      ...ids,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
