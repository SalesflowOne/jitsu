import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { dbQuery, getOrgId } from "@/lib/db";
import { CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import type { GetServerSideProps } from "next";
import { useState } from "react";

type Event = { event_name: string; utm_source: string | null; utm_campaign: string | null; occurred_at: string };

type Props = { events: Event[]; live: boolean };

const SNIPPET = `<script>
  window.jitsuConfig = { key: "YOUR_JITSU_WRITE_KEY", trackingHost: "https://your-jitsu-host" };
</script>
<script async src="https://your-jitsu-host/p.js"></script>`;

export default function SetupPage({ events, live }: Props) {
  const [copied, setCopied] = useState(false);

  const copySnippet = () => {
    navigator.clipboard.writeText(SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const missingUtm = events.filter(e => !e.utm_source && e.event_name === "page_view").length;
  const hasConversions = events.some(e => e.event_name === "payment_completed" || e.event_name === "deal_closed_won");

  return (
    <DashboardLayout title="Setup & Tracking">
      {!live && <DemoBanner />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jitsu status */}
        <div className="metric-card">
          <h3 className="font-semibold text-gray-900">Jitsu Connection</h3>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span>SDK ready — configure write key below</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Point your Jitsu rotor function to <code className="rounded bg-gray-100 px-1">POST /api/ingest/events</code>
          </p>
        </div>

        {/* Warnings */}
        <div className="metric-card">
          <h3 className="font-semibold text-gray-900">Health Checks</h3>
          <div className="mt-3 space-y-2 text-sm">
            {missingUtm > 0 ? (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                {missingUtm} page view(s) missing UTM parameters
              </div>
            ) : (
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-4 w-4" /> All recent page views have UTMs
              </div>
            )}
            {!hasConversions ? (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                No conversion events detected yet
              </div>
            ) : (
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-4 w-4" /> Conversion events detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking snippet */}
      <div className="mt-6 metric-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Tracking Script</h3>
          <button onClick={copySnippet} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800">
            <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">{SNIPPET}</pre>
      </div>

      {/* Event debugger */}
      <div className="mt-6">
        <h3 className="mb-3 font-semibold text-gray-900">Recent Events</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Event", "Source", "Campaign", "Time"].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{e.event_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{e.utm_source ?? "—"}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{e.utm_campaign ?? "—"}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{new Date(e.occurred_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const orgId = getOrgId();
  const rows = await dbQuery<{ event_name: string; utm_source: string; utm_campaign: string; occurred_at: string }>(
    `SELECT event_name, utm_source, utm_campaign, occurred_at
     FROM analytics.events WHERE org_id = $1 ORDER BY occurred_at DESC LIMIT 20`,
    [orgId]
  );

  if (rows.length > 0) {
    return { props: { live: true, events: rows } };
  }

  return { props: { live: false, events: DEMO_EVENTS } };
};
