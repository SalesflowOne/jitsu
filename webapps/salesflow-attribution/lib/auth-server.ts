import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import type { NextApiRequest } from "next";
import { getDb, getOrgId as getDemoOrgId } from "./db";
import { isClerkEnabled } from "./clerk-config";

export type DashboardAuth = {
  orgId: string;
  userId: string | null;
  dbConnected: boolean;
};

export async function getDashboardAuth(ctx: GetServerSidePropsContext): Promise<DashboardAuth | null> {
  if (!isClerkEnabled()) {
    return {
      orgId: getDemoOrgId(),
      userId: null,
      dbConnected: !!getDb(),
    };
  }

  const { getAuth } = await import("@clerk/nextjs/server");
  const auth = getAuth(ctx.req);
  if (!auth.userId) {
    return null;
  }

  return {
    orgId: auth.orgId ?? getDemoOrgId(),
    userId: auth.userId,
    dbConnected: !!getDb(),
  };
}

export async function withDashboardAuth<P extends Record<string, unknown>>(
  ctx: GetServerSidePropsContext,
  loader: (auth: DashboardAuth) => Promise<P>
): Promise<GetServerSidePropsResult<P & { auth: DashboardAuth }>> {
  const auth = await getDashboardAuth(ctx);
  if (!auth) {
    return { redirect: { destination: "/sign-in", permanent: false } };
  }
  const props = await loader(auth);
  return { props: { ...props, auth } };
}

export async function resolveApiOrgId(req: NextApiRequest, bodyOrgId?: string): Promise<string> {
  if (!isClerkEnabled()) {
    return bodyOrgId ?? getDemoOrgId();
  }
  const { getAuth } = await import("@clerk/nextjs/server");
  const auth = getAuth(req);
  if (!auth.userId) {
    throw new Error("Unauthorized");
  }
  return auth.orgId ?? bodyOrgId ?? getDemoOrgId();
}
