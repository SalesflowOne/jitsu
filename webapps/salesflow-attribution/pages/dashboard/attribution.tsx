import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_ATTRIBUTION } from "@/lib/demo-data";
import { dbQuery, getOrgId } from "@/lib/db";
import type { GetServerSideProps } from "next";

type Row = { model: string; campaign: string; revenue: number };

type Props = { data: Row[]; live: boolean };

const MODEL_LABELS: Record<string, string> = {
  first_touch_v1: "First Touch",
  last_touch_v1: "Last Touch",
  linear_v1: "Linear Multi-Touch",
};

export default function AttributionPage({ data, live }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const models = [...new Set(data.map(d => d.model))];

  return (
    <DashboardLayout title="Attribution Models">
      {!live && <DemoBanner />}
      <p className="mb-6 text-sm text-gray-600">
        Compare how revenue credit shifts across first-touch, last-touch, and linear models. Different models tell
        different stories — that&apos;s the point.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
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

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const orgId = getOrgId();
  const rows = await dbQuery<{ model_name: string; campaign: string; attributed_revenue: string }>(
    `SELECT model_name, campaign, attributed_revenue
     FROM analytics.v_attribution_comparison
     WHERE org_id = $1
     ORDER BY model_name, attributed_revenue DESC`,
    [orgId]
  );

  if (rows.length > 0) {
    return {
      props: {
        live: true,
        data: rows.map(r => ({ model: r.model_name, campaign: r.campaign, revenue: Number(r.attributed_revenue) })),
      },
    };
  }

  return { props: { data: DEMO_ATTRIBUTION, live: false } };
};
