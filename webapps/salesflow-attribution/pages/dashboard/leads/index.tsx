import Link from "next/link";
import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_LEADS } from "@/lib/demo-data";
import { dbQuery } from "@/lib/db";
import { withDashboardAuth } from "@/lib/auth-server";
import type { GetServerSideProps } from "next";

type Lead = {
  id: string;
  name: string;
  email: string;
  status: string;
  first_touch: string | null;
  last_touch: string | null;
  revenue: number;
};

type Props = { leads: Lead[]; live: boolean };

export default function LeadsPage({ leads, live }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <DashboardLayout title="Lead Journey">
      {!live && <DemoBanner />}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Lead", "Status", "First Touch", "Last Touch", "Revenue", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{l.name}</p>
                  <p className="text-xs text-gray-500">{l.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{l.first_touch ?? "—"}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{l.last_touch ?? "—"}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.revenue > 0 ? fmt(l.revenue) : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/leads/${l.id}`} className="text-sm text-brand-600 hover:text-brand-800">
                    View journey →
                  </Link>
                </td>
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
      lead_id: string;
      email: string;
      name: string;
      status: string;
      first_touch_source: string;
      last_touch_source: string;
      total_revenue: string;
    }>(`SELECT * FROM analytics.v_lead_journey WHERE org_id = $1 ORDER BY first_seen_at DESC LIMIT 50`, [auth.orgId]);

    if (rows.length > 0) {
      return {
        live: true,
        leads: rows.map(r => ({
          id: r.lead_id,
          name: r.name ?? "Unknown",
          email: r.email ?? "",
          status: r.status,
          first_touch: r.first_touch_source,
          last_touch: r.last_touch_source,
          revenue: Number(r.total_revenue),
        })),
      };
    }

    return { leads: DEMO_LEADS, live: false };
  });
};
