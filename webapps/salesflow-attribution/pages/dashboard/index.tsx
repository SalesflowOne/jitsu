import { DashboardLayout, DemoBanner, MetricCard } from "@/components/DashboardLayout";
import { DEMO_OVERVIEW } from "@/lib/demo-data";
import { dbQuery, getOrgId } from "@/lib/db";
import type { GetServerSideProps } from "next";

type Props = {
  metrics: typeof DEMO_OVERVIEW;
  live: boolean;
};

export default function DashboardOverview({ metrics, live }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <DashboardLayout title="Overview">
      {!live && <DemoBanner />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Spend" value={fmt(metrics.total_spend)} />
        <MetricCard label="Leads" value={String(metrics.total_leads)} />
        <MetricCard label="Booked Appointments" value={String(metrics.booked_appointments)} />
        <MetricCard label="Conversions" value={String(metrics.total_conversions)} />
        <MetricCard label="Revenue" value={fmt(metrics.total_revenue)} />
        <MetricCard label="ROAS" value={`${metrics.roas}x`} sub="Return on ad spend" />
        <MetricCard label="Cost per Lead" value={fmt(metrics.cost_per_lead)} />
        <MetricCard
          label="Cost per Conversion"
          value={fmt(metrics.cost_per_conversion)}
          sub={`${metrics.lead_to_close_pct}% lead-to-close`}
        />
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const orgId = getOrgId();
  const rows = await dbQuery<{
    total_leads: string;
    booked_appointments: string;
    total_conversions: string;
    total_revenue: string;
    total_spend: string;
    cost_per_lead: string;
    cost_per_conversion: string;
    lead_to_close_pct: string;
  }>(`SELECT * FROM analytics.v_cost_metrics WHERE org_id = $1`, [orgId]);

  if (rows.length > 0) {
    const r = rows[0];
    const spend = Number(r.total_spend);
    const revenue = Number(r.total_revenue);
    return {
      props: {
        live: true,
        metrics: {
          total_spend: spend,
          total_leads: Number(r.total_leads),
          booked_appointments: Number(r.booked_appointments),
          total_conversions: Number(r.total_conversions),
          total_revenue: revenue,
          roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
          cost_per_lead: Number(r.cost_per_lead) || 0,
          cost_per_conversion: Number(r.cost_per_conversion) || 0,
          lead_to_close_pct: Number(r.lead_to_close_pct) || 0,
        },
      },
    };
  }

  return { props: { metrics: DEMO_OVERVIEW, live: false } };
};
