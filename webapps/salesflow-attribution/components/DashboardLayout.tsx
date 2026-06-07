import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, GitBranch, LayoutDashboard, Settings, Upload, Users } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import classNames from "classnames";
import { isClerkEnabled } from "@/lib/clerk-config";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: BarChart3 },
  { href: "/dashboard/attribution", label: "Attribution", icon: GitBranch },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/setup", label: "Setup", icon: Settings },
];

export function DashboardLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
            S
          </div>
          <span className="font-semibold text-gray-900">Attribution</span>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200 p-4">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700">
            ← Back to landing page
          </Link>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {isClerkEnabled() && <UserButton afterSignOutUrl="/" />}
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Showing demo data for <code className="rounded bg-amber-100 px-1">org_demo</code>. Connect Supabase via{" "}
      <code className="rounded bg-amber-100 px-1">SUPABASE_DATABASE_URL</code> for live data.
    </div>
  );
}
