import Head from "next/head";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  LineChart,
  Phone,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const features = [
  "UTM source, medium, campaign tracking",
  "Ad click IDs: gclid, fbclid, ttclid, msclkid",
  "Landing page and form tracking",
  "Phone call click tracking",
  "Booking and appointment events",
  "Payment and closed-deal revenue",
  "First-touch, last-touch, and multi-touch attribution",
  "ROAS and cost-per-conversion reports",
];

const useCases = [
  { title: "CNA / Healthcare Training", desc: "Ad → application → enrollment → tuition payment" },
  { title: "Local Service Businesses", desc: "Ad → call → booked job → invoice paid" },
  { title: "High-Ticket Funnels", desc: "Ad → webinar → strategy call → closed deal" },
  { title: "Agencies", desc: "Client ROAS proof across multiple campaigns" },
  { title: "Coaching & Consulting", desc: "Ad → opt-in → call → program purchase" },
  { title: "Medical / Aesthetic Clinics", desc: "Ad → consultation → treatment purchase" },
];

const steps = [
  { label: "Campaign", desc: "Track UTMs and ad click IDs", icon: Target },
  { label: "Capture", desc: "Landing pages, forms, calls", icon: Zap },
  { label: "Convert", desc: "Leads and appointments", icon: Phone },
  { label: "Close", desc: "Payments and deals", icon: DollarSign },
  { label: "Attribute", desc: "Credit assignment models", icon: BarChart3 },
  { label: "Optimize", desc: "Scale what works", icon: TrendingUp },
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Salesflow Attribution — Know Which Ads Actually Make Money</title>
        <meta
          name="description"
          content="Track the full journey from ad click to lead, call, appointment, payment, and closed deal. See what really produces revenue."
        />
      </Head>

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold text-gray-900">Salesflow Attribution</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/dashboard/setup" className="btn-primary text-sm py-2 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 py-24 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-200">
            Ad-to-Revenue Attribution
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Know Which Ads Actually Turn Into Revenue
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100">
            Salesflow Attribution tracks the full journey from ad click to lead, call, appointment, payment, and closed
            deal — so you can scale what actually produces revenue.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard" className="btn-primary bg-accent hover:bg-accent-dark">
              Request a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/setup"
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              Track My Campaigns
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">Ad Platforms Show Clicks. Not Money.</h2>
          <p className="mt-4 text-lg text-gray-600">
            Google and Meta tell you how many clicks and leads you got. Your CRM tells you how many deals closed. But
            nothing connects the two. Most agencies stop at lead count. Business owners are left guessing which
            campaigns actually produced revenue — and which ones burned budget.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="section-heading">See the Full Path from Ad to Revenue</h2>
          <p className="mt-4 text-lg text-gray-600">
            Salesflow Attribution connects your ads, landing pages, forms, phone calls, bookings, CRM pipeline, and
            payments into one clear picture. No more spreadsheet gymnastics.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="section-heading text-center">Campaign → Capture → Convert → Close → Attribute → Optimize</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map(step => (
              <div key={step.label} className="metric-card">
                <step.icon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 text-lg font-semibold">{step.label}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we track */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="section-heading text-center">What We Track</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {features.map(f => (
              <div key={f} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reports */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="section-heading">Reports That Follow the Money</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Cost per Lead", icon: LineChart },
              { label: "Cost per Appointment", icon: Phone },
              { label: "ROAS by Campaign", icon: TrendingUp },
              { label: "Lead Journey Timeline", icon: BarChart3 },
            ].map(r => (
              <div key={r.label} className="metric-card text-center">
                <r.icon className="mx-auto h-8 w-8 text-brand-600" />
                <p className="mt-3 font-semibold text-gray-900">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Salesflow */}
      <section className="bg-brand-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">We Don&apos;t Just Report Numbers. We Build the Machine.</h2>
          <p className="mt-4 text-lg text-brand-200">
            Salesflow doesn&apos;t hand you a dashboard and walk away. We build, track, optimize, and improve your
            entire revenue machine — from the ad to the closed deal. Attribution is the missing piece that tells you
            what&apos;s actually working.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="section-heading text-center">Built for Businesses That Need Revenue Clarity</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map(uc => (
              <div key={uc.title} className="metric-card">
                <h3 className="font-semibold text-gray-900">{uc.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">See Which Ads Are Actually Making You Money</h2>
          <p className="mt-4 text-lg text-brand-100">Stop guessing. Start attributing.</p>
          <Link href="/dashboard/setup" className="btn-primary mt-8 bg-white text-brand-700 hover:bg-brand-50">
            Build My Salesflow Machine
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">Salesflow Attribution — Open-source foundation powered by Jitsu</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/dashboard/setup" className="hover:text-gray-900">
              Setup
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
