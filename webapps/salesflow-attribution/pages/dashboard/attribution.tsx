import { useState } from "react";
import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_ATTRIBUTION } from "@/lib/demo-data";
import { dbQuery } from "@/lib/db";
import { withDashboardAuth, type DashboardAuth } from "@/lib/auth-server";
import type { GetServerSideProps } from "next";

type Row = { model: string; campaign: string; revenue: number };

type Props = { data: Row[]; live: boolean; auth: DashboardAuth };

const MODEL_LABELS: Record<string, string> = {
  first_touch_v1: "First Touch",
  last_touch_v1: "Last Touch",
  linear_v1: "Linear",
  u_shaped_v1: "U-Shaped",
  time_decay_v1: "Time Decay",
  position_based_v1: "Position Based",
};

export default function AttributionPage({ data, live, auth }: Props) {
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const models = [...new Set(data.map(d => d.model))];

  const runAllModels = async () => {
    setRunning(true);
    setRunStatus(null);
    try {
      const res = await fetch("/api/attribution/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_all: true, lookback_days: 90 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRunStatus(
        `Attribution complete. ${Object.keys(json.run_ids ?? {}).length} models run. Refresh to see results.`
      );
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setRunStatus(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout title="Attribution Models">
      {!live && <DemoBanner />}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Compare how revenue credit shifts across models. Org:{" "}
          <code className="rounded bg-gray-100 px-1">{auth.orgId}</code>
        </p>
        <button type="button" className="btn-primary" disabled={running || !auth.dbConnected} onClick={runAllModels}>
          {running ? "Running…" : "Run All Models"}
        </button>
      </div>
      {runStatus && <p className="mb-4 text-sm text-brand-700">{runStatus}</p>}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {models.map(model => {
          const rows = data.filter(d => d.model === model);
          const total = rows.reduce((s, r) => s + r.revenue, 0);
          return (
            <div key={model} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-semibold text-gray-900">{MODEL_LABELS[model] ?? model}</h3>
                <p className="text-sm text-gray-500">Total: {fmt(total)}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {rows.map(r => (
                  <div key={r.campaign} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700">{r.campaign}</span>
                    <span className="text-sm font-medium text-gray-900">{fmt(r.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ctx => {
  return withDashboardAuth(ctx, async auth => {
    const rows = await dbQuery<{ model_name: string; campaign: string; attributed_revenue: string }>(
      `SELECT model_name, campaign, attributed_revenue
       FROM analytics.v_attribution_comparison WHERE org_id = $1
       ORDER BY model_name, attributed_revenue DESC`,
      [auth.orgId]
    );

    if (rows.length > 0) {
      return {
        live: true,
        data: rows.map(r => ({ model: r.model_name, campaign: r.campaign, revenue: Number(r.attributed_revenue) })),
      };
    }

    return { data: DEMO_ATTRIBUTION, live: false };
  });
};
