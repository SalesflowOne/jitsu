import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { persistIngestResult, processIngestPayload } from "@salesflow/attribution-core";
import { getDb } from "@/lib/db";

export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const orgId = process.env.SALESFLOW_STRIPE_ORG_ID ?? process.env.SALESFLOW_DEMO_ORG_ID ?? "org_demo";

  if (!secret || !stripeKey) {
    return res.status(503).json({ error: "Stripe not configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)" });
  }

  const db = getDb();
  if (!db) return res.status(503).json({ error: "Database not configured" });

  const stripe = new Stripe(stripeKey);
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).json({ error: "Missing stripe-signature" });

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid signature" });
  }

  const dbClient = {
    query: async (sql: string, params?: unknown[]) => {
      const r = await db.query(sql, params);
      return { rows: r.rows as Record<string, unknown>[] };
    },
  };

  try {
    if (event.type === "payment_intent.succeeded" || event.type === "checkout.session.completed") {
      let email: string | undefined;
      let amount = 0;
      let paymentId: string | undefined;

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Stripe.PaymentIntent;
        amount = (pi.amount_received ?? pi.amount ?? 0) / 100;
        paymentId = pi.id;
        email = (pi.receipt_email ?? pi.metadata?.email) || undefined;
      } else {
        const session = event.data.object as Stripe.Checkout.Session;
        amount = (session.amount_total ?? 0) / 100;
        paymentId = (session.payment_intent as string) ?? session.id;
        email = session.customer_details?.email ?? session.customer_email ?? undefined;
      }

      const payload = {
        org_id: orgId,
        source: "stripe" as const,
        event: {
          type: "track",
          event: "payment_completed",
          messageId: `stripe_${event.id}`,
          timestamp: new Date(event.created * 1000).toISOString(),
          properties: {
            email,
            revenue_amount: amount,
            currency: "USD",
            payment_id: paymentId,
            stripe_event_id: event.id,
          },
        },
      };

      const result = processIngestPayload(payload, orgId);
      await persistIngestResult(dbClient, result);
    }

    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Webhook handler failed" });
  }
}
