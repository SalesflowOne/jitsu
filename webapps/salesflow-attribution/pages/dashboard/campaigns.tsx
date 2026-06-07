import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_CAMPAIGNS } from "@/lib/demo-data";
import { dbQuery } from "@/lib/db";
import { withDashboardAuth } from "@/lib/auth-server";
import type { GetServerSideProps } from "next";

type Campaign = {
  campaign: string;
  platform: string;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
  roas: number | null;
};

type Props = { campaigns: Campaign[]; live: boolean };

export default function CampaignsPage({ campaigns, live }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <DashboardLayout title="Campaigns">
      {!live && <DemoBanner />}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Campaign", "Platform", "Spend", "Leads", "Conversions", "Revenue", "ROAS"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map(c => (
              <tr key={c.campaign} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.campaign}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{c.platform}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmt(c.spend)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.leads}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.conversions}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(c.revenue)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-accent">{c.roas != null ? `${c.roas}x` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ctx => {
  return withDashboardAuth(ctx, async auth => {
    const rows = await dbQuery<{
      campaign: string;
      ad_platform: string;
      attributed_revenue: string;
      conversions: string;
      spend: string;
      roas: string;
    }>(
      `SELECT r.campaign, r.ad_platform, r.attributed_revenue, r.conversions,
              coalesce(s.total_spend, 0) as spend, v.roas
       FROM analytics.v_revenue_by_campaign r
       LEFT JOIN analytics.v_spend_by_campaign s ON s.org_id = r.org_id AND lower(s.campaign) = lower(r.campaign)
       LEFT JOIN analytics.v_roas_by_campaign v ON v.org_id = r.org_id AND v.campaign = r.campaign AND v.model_name = r.model_name
       WHERE r.org_id = $1 AND r.model_name = 'last_touch_v1'
       ORDER BY r.attributed_revenue DESC`,
      [auth.orgId]
    );

    if (rows.length > 0) {
      const leadCounts = await dbQuery<{ utm_campaign: string; cnt: string }>(
        `SELECT utm_campaign, count(*) as cnt FROM analytics.leads WHERE org_id = $1 GROUP BY utm_campaign`,
        [auth.orgId]
      );
      const leadMap = Object.fromEntries(leadCounts.map(r => [r.utm_campaign, Number(r.cnt)]));

      return {
        live: true,
        campaigns: rows.map(r => ({
          campaign: r.campaign,
          platform: r.ad_platform,
          spend: Number(r.spend),
          leads: leadMap[r.campaign] ?? 0,
          conversions: Number(r.conversions),
          revenue: Number(r.attributed_revenue),
          roas: r.roas ? Number(r.roas) : null,
        })),
      };
    }

    return { campaigns: DEMO_CAMPAIGNS, live: false };
  });
};
