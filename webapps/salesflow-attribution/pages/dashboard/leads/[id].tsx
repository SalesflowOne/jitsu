import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { dbQuery, getOrgId } from "@/lib/db";
import type { GetServerSideProps } from "next";
import Link from "next/link";

type Touchpoint = {
  source?: string;
  campaign?: string;
  ad_platform?: string;
  landing_page?: string;
  occurred_at: string;
};
type Conversion = { type: string; revenue: number; occurred_at: string };

type Props = {
  lead: { name: string; email: string; status: string; revenue: number };
  touchpoints: Touchpoint[];
  conversions: Conversion[];
  live: boolean;
};

export default function LeadDetailPage({ lead, touchpoints, conversions, live }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <DashboardLayout title={`Lead: ${lead.name}`}>
      {!live && <DemoBanner />}
      <Link href="/dashboard/leads" className="mb-4 inline-block text-sm text-brand-600 hover:text-brand-800">
        ← All leads
      </Link>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{lead.email}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium capitalize">{lead.status}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="font-medium">{fmt(lead.revenue)}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Touchpoint Timeline</h2>
      <div className="mb-8 space-y-3">
        {touchpoints.map((tp, i) => (
          <div key={i} className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {i + 1}
            </div>
            <div>
              <p className="font-medium capitalize">
                {tp.source ?? "direct"} / {tp.campaign ?? "unknown"}
              </p>
              <p className="text-sm text-gray-500">
                {tp.ad_platform} · {tp.landing_page} · {new Date(tp.occurred_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {touchpoints.length === 0 && <p className="text-sm text-gray-500">No touchpoints recorded.</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Conversions</h2>
      <div className="space-y-3">
        {conversions.map((c, i) => (
          <div key={i} className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p className="font-medium">
              {c.type} — {fmt(c.revenue)}
            </p>
            <p className="text-sm text-gray-500">{new Date(c.occurred_at).toLocaleDateString()}</p>
          </div>
        ))}
        {conversions.length === 0 && <p className="text-sm text-gray-500">No conversions yet.</p>}
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const orgId = getOrgId();
  const leadId = params?.id as string;

  const rows = await dbQuery<{
    email: string;
    name: string;
    status: string;
    total_revenue: string;
    touchpoints: Touchpoint[];
    conversions: { type: string; revenue: number; occurred_at: string }[];
  }>(`SELECT * FROM analytics.v_lead_journey WHERE org_id = $1 AND lead_id = $2`, [orgId, leadId]);

  if (rows.length > 0) {
    const r = rows[0];
    return {
      props: {
        live: true,
        lead: { name: r.name ?? "Unknown", email: r.email ?? "", status: r.status, revenue: Number(r.total_revenue) },
        touchpoints: r.touchpoints ?? [],
        conversions: (r.conversions ?? []).map(c => ({ ...c, revenue: Number(c.revenue) })),
      },
    };
  }

  // Demo fallback
  return {
    props: {
      live: false,
      lead: { name: "Demo Lead 1", email: "lead1@demo.school.edu", status: "converted", revenue: 8500 },
      touchpoints: [
        {
          source: "google",
          campaign: "cna-enrollment-spring",
          ad_platform: "google",
          landing_page: "/landing/cna-program",
          occurred_at: "2026-05-03T10:00:00Z",
        },
        {
          source: "facebook",
          campaign: "cna-retargeting",
          ad_platform: "meta",
          landing_page: "/pricing",
          occurred_at: "2026-05-06T14:00:00Z",
        },
      ],
      conversions: [{ type: "payment_completed", revenue: 8500, occurred_at: "2026-05-17T16:00:00Z" }],
    },
  };
};
