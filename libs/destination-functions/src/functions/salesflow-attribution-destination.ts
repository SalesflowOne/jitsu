import { JitsuFunction } from "@jitsu/protocols/functions";
import { RetryError } from "@jitsu/functions-lib";
import type { AnalyticsServerEvent } from "@jitsu/protocols/analytics";
import { SalesflowAttributionDestinationConfig } from "../meta";

const SalesflowAttributionDestination: JitsuFunction<
  AnalyticsServerEvent,
  SalesflowAttributionDestinationConfig
> = async (event, ctx) => {
  const ingestUrl = ctx.props.ingestUrl.replace(/\/$/, "") + "/api/ingest/events";
  const orgId = ctx.props.orgId;

  try {
    const res = await ctx.fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.props.apiKey}`,
      },
      body: JSON.stringify({
        org_id: orgId,
        source: "jitsu",
        jitsu_workspace_id: ctx.workspace.id,
        event,
      }),
    });

    if (!res.ok) {
      const text = (await res.text()).substring(0, 255);
      throw new Error(`Salesflow ingest failed: ${res.status} ${text}`);
    }

    ctx.log.debug(`Forwarded ${event.type}/${event.event ?? ""} to Salesflow Attribution`);
    return event;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new RetryError(message);
  }
};

SalesflowAttributionDestination.displayName = "salesflow-attribution-destination";

export default SalesflowAttributionDestination;
