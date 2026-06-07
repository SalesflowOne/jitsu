import { Pool } from "pg";

let pool: Pool | null = null;

export function getDb(): Pool | null {
  const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 5 });
  }
  return pool;
}

export async function dbQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.query(sql, params);
  return result.rows as T[];
}

export function getOrgId(fallback = "org_demo"): string {
  return process.env.SALESFLOW_DEMO_ORG_ID ?? fallback;
}
