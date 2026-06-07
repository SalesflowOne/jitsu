import { useState } from "react";
import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { withDashboardAuth, type DashboardAuth } from "@/lib/auth-server";
import type { GetServerSideProps } from "next";

type Props = { auth: DashboardAuth };

const AD_SPEND_TEMPLATE = `date,platform,campaign_name,campaign_id,spend,impressions,clicks
2026-05-01,google,cna-enrollment-spring,camp_g_001,450.00,12000,380`;

const CONVERSIONS_TEMPLATE = `email,revenue_amount,occurred_at,payment_id,conversion_type
lead1@demo.school.edu,8500,2026-05-17T16:00:00Z,pi_demo_1,payment_completed`;

export default function ImportPage({ auth }: Props) {
  const [adSpendCsv, setAdSpendCsv] = useState("");
  const [conversionsCsv, setConversionsCsv] = useState("");
  const [platform, setPlatform] = useState("google");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const importAdSpend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/import/ad-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: adSpendCsv, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`Imported ${data.imported} ad spend rows.`);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const importConversions = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/import/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: conversionsCsv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`Imported ${data.imported} conversions.`);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="CSV Import">
      {!auth.dbConnected && <DemoBanner />}
      <p className="mb-6 text-sm text-gray-600">
        Import ad spend and conversion data from Google Ads, Meta, TikTok, Stripe, or CRM exports. Org:{" "}
        <code className="rounded bg-gray-100 px-1">{auth.orgId}</code>
      </p>

      {status && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {status}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="metric-card">
          <h3 className="font-semibold text-gray-900">Ad Spend CSV</h3>
          <p className="mt-1 text-xs text-gray-500">
            Columns: date, platform, campaign_name, spend, impressions, clicks
          </p>
          <select
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
          >
            <option value="google">Google Ads</option>
            <option value="meta">Meta Ads</option>
            <option value="tiktok">TikTok Ads</option>
          </select>
          <textarea
            className="mt-3 h-40 w-full rounded-lg border border-gray-300 p-3 font-mono text-xs"
            value={adSpendCsv}
            onChange={e => setAdSpendCsv(e.target.value)}
            placeholder={AD_SPEND_TEMPLATE}
          />
          <button type="button" className="btn-primary mt-3" disabled={loading || !adSpendCsv} onClick={importAdSpend}>
            Import Ad Spend
          </button>
        </div>

        <div className="metric-card">
          <h3 className="font-semibold text-gray-900">Conversions CSV</h3>
          <p className="mt-1 text-xs text-gray-500">Columns: email, revenue_amount, occurred_at, payment_id</p>
          <textarea
            className="mt-3 h-48 w-full rounded-lg border border-gray-300 p-3 font-mono text-xs"
            value={conversionsCsv}
            onChange={e => setConversionsCsv(e.target.value)}
            placeholder={CONVERSIONS_TEMPLATE}
          />
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={loading || !conversionsCsv}
            onClick={importConversions}
          >
            Import Conversions
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ctx => {
  return withDashboardAuth(ctx, async auth => ({ auth }));
};
