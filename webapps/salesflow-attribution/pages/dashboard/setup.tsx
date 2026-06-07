import { useState } from "react";
import { DashboardLayout, DemoBanner } from "@/components/DashboardLayout";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { dbQuery } from "@/lib/db";
import { withDashboardAuth, type DashboardAuth } from "@/lib/auth-server";
import { CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import type { GetServerSideProps } from "next";

type Event = { event_name: string; utm_source: string | null; utm_campaign: string | null; occurred_at: string };

type Integration = {
  integration_type: string;
  jitsu_workspace_id: string | null;
  status: string;
};

type Props = {
  events: Event[];
  integrations: Integration[];
  live: boolean;
  auth: DashboardAuth;
};

const SNIPPET = `<script>
  window.jitsuConfig = { key: "YOUR_JITSU_WRITE_KEY", trackingHost: "https://your-jitsu-host" };
</script>
<script async src="https://your-jitsu-host/p.js"></script>`;

export default function SetupPage({ events, integrations, live, auth }: Props) {
  const [copied, setCopied] = useState(false);
  const [jitsuWorkspaceId, setJitsuWorkspaceId] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const copySnippet = () => {
    navigator.clipboard.writeText(SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveJitsuIntegration = async () => {
    setSaveStatus(null);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        integration_type: "jitsu",
        jitsu_workspace_id: jitsuWorkspaceId,
        config: { ingest_url: typeof window !== "undefined" ? window.location.origin : "" },
      }),
    });
    const data = await res.json();
    setSaveStatus(res.ok ? "Jitsu integration saved." : data.error);
  };

  const missingUtm = events.filter(e => !e.utm_source && e.event_name === "page_view").length;
  const hasConversions = events.some(e => e.event_name === "payment_completed" || e.event_name === "deal_closed_won");
  const ingestUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/ingest/events` : "/api/ingest/events";

  return (
    <DashboardLayout title="Setup & Tracking">
      {!live && <DemoBanner />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="metric-card">
          <h3 className="font-semibold text-gray-900">Jitsu Connection</h3>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span>
              Use destination: <code className="text-xs">builtin.destination.salesflow-attribution</code>
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Ingest URL: <code className="rounded bg-gray-100 px-1">{ingestUrl}</code>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Org: <code className="rounded bg-gray-100 px-1">{auth.orgId}</code>
          </p>
        </div>

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

      <div className="mt-6 metric-card">
        <h3 className="font-semibold text-gray-900">Link Jitsu Workspace</h3>
        <p className="mt-1 text-xs text-gray-500">
          Map your Jitsu workspace ID to this Clerk org for automatic event routing.
        </p>
        {integrations.length > 0 && (
          <ul className="mt-2 text-sm text-gray-600">
            {integrations.map(i => (
              <li key={i.integration_type}>
                {i.integration_type}: {i.jitsu_workspace_id ?? "—"} ({i.status})
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Jitsu workspace ID (e.g. ws_abc123)"
            value={jitsuWorkspaceId}
            onChange={e => setJitsuWorkspaceId(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={saveJitsuIntegration}>
            Save
          </button>
        </div>
        {saveStatus && <p className="mt-2 text-sm text-brand-700">{saveStatus}</p>}
      </div>

      <div className="mt-6 metric-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Tracking Script</h3>
          <button
            type="button"
            onClick={copySnippet}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">{SNIPPET}</pre>
      </div>

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

export const getServerSideProps: GetServerSideProps = async ctx => {
  return withDashboardAuth(ctx, async auth => {
    const rows = await dbQuery<{ event_name: string; utm_source: string; utm_campaign: string; occurred_at: string }>(
      `SELECT event_name, utm_source, utm_campaign, occurred_at
       FROM analytics.events WHERE org_id = $1 ORDER BY occurred_at DESC LIMIT 20`,
      [auth.orgId]
    );

    const integrations = await dbQuery<Integration>(
      `SELECT integration_type, jitsu_workspace_id, status FROM analytics.integrations WHERE org_id = $1`,
      [auth.orgId]
    );

    if (rows.length > 0) {
      return { live: true, events: rows, integrations };
    }

    return { live: false, events: DEMO_EVENTS, integrations };
  });
};
