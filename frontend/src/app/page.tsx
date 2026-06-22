"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { SpinnerDemo } from "@/components/SpinnerDemo";

// ─── Design tokens (inline for landing page) ──────────────────
const C = {
  surface: "#111111",
  surface2: "#161616",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.13)",
};

// ─── Data ─────────────────────────────────────────────────────

const FEATURES = [
  { icon: "💰", title: "50% Revenue Share", desc: "Earn half of every CPM your machine generates — automatically credited after each impression.", metric: "~$4.50 avg CPM" },
  { icon: "🎯", title: "Real-Time Auction", desc: "Advertisers compete in an English-ascending auction. Highest bidder wins — and can be outbid any moment.", metric: "~5s per impression" },
  { icon: "🔒", title: "Zero Code Access", desc: "SpinEarn only detects spinner activity. Your code, prompts, and AI completions are never read.", metric: "Privacy first" },
  { icon: "⚡", title: "1-Click Install", desc: "Install from the VS Code Marketplace, sign in with GitHub or Google, and you're earning.", metric: "< 30s setup" },
  { icon: "💳", title: "Fast Payouts", desc: "Withdraw via Wise (global) or Razorpay (India) once your balance hits $10.", metric: "$10 minimum" },
  { icon: "📊", title: "Live Analytics", desc: "Track impressions, clicks, CTR, and earnings per period from your developer dashboard.", metric: "30s refresh" },
];

const DEV_STEPS = [
  { n: "01", title: "Install extension", desc: "Add SpinEarn to VS Code from the Marketplace. One click, no configuration." },
  { n: "02", title: "Sign in", desc: "Authenticate with GitHub or Google to link your earnings account." },
  { n: "03", title: "Code as usual", desc: "Every Claude Code tool run is a potential impression. Nothing changes about your workflow." },
  { n: "04", title: "Get paid", desc: "Withdraw via Wise or Razorpay when your balance reaches $10. 50% of all CPM." },
];

const ADV_STEPS = [
  { n: "01", title: "Write your ad", desc: "One line of copy — max 80 characters. Clear, developer-relevant, honest." },
  { n: "02", title: "Set your CPM bid", desc: "Enter your price per 1,000 impressions. Start from $0.01. You control spending." },
  { n: "03", title: "Win the auction", desc: "Your ad shows when you're the current highest bidder. Compete in real time." },
  { n: "04", title: "Track performance", desc: "Monitor impressions, clicks, CTR, and spend from your campaign dashboard." },
];

const TESTIMONIALS = [
  { name: "Alex Chen", role: "Full-stack developer", avatar: "AC", grad: "from-blue-500 to-cyan-500", text: "SpinEarn turned my AI subscription cost into passive income. Every time Claude thinks, I earn — without changing a thing about how I code." },
  { name: "Priya Sharma", role: "Senior Engineer", avatar: "PS", grad: "from-violet-500 to-purple-500", text: "I use Claude Code 8 hours a day. Installing SpinEarn was the best 30-second decision I've made this year." },
  { name: "Marcus Johnson", role: "Freelance developer", avatar: "MJ", grad: "from-emerald-500 to-teal-500", text: "The auction model is genius. Multiple advertisers competing for my attention — my CPM keeps going up." },
  { name: "Sarah Kim", role: "DevRel Engineer", avatar: "SK", grad: "from-orange-500 to-amber-500", text: "The privacy-first approach sold me. SpinEarn never touches my code or AI prompts." },
  { name: "Diego Morales", role: "OSS contributor", avatar: "DM", grad: "from-rose-500 to-pink-500", text: "Finally something that compensates developers for the attention we give to AI tools. This is the future." },
  { name: "Emma Wilson", role: "Backend engineer", avatar: "EW", grad: "from-indigo-500 to-blue-500", text: "Completely seamless. The ads show for 5 seconds per spinner — I barely notice, but the earnings compound." },
];

const FAQ_ITEMS = [
  { q: "How does SpinEarn work?", a: "SpinEarn is a VS Code extension that detects when Claude Code runs a tool. During each 5-second spinner window, a sponsor's 1-line ad appears. You earn 50% of the CPM every time an impression is recorded — automatically." },
  { q: "Is this really passive income?", a: "Yes. After installing and signing in, SpinEarn runs entirely in the background. Every Claude Code tool call is a potential impression. You don't change how you code." },
  { q: "Does SpinEarn read my code or prompts?", a: "Never. SpinEarn only detects spinner activity — when Claude Code is running a tool. It cannot read your editor content, code, AI prompts, or completions. Your work stays 100% private." },
  { q: "How do I get paid?", a: "When your balance reaches $10, you can request a payout. Global developers use Wise (bank transfer to 80+ countries). Indian developers can use Razorpay (bank transfer or UPI). Payouts process within 1-3 business days." },
  { q: "How much can I realistically earn?", a: "Based on 50 impressions/hour at $4.50 CPM: 4 hours/day × 22 working days ≈ $9.90/month passively. Heavy users (6-8h/day) report $20-45/month. It scales linearly with Claude Code usage." },
  { q: "Can I control which ads I see?", a: "All ads are pre-moderated — they must be developer-relevant and non-offensive. Category filters are in development. You can always pause the extension from VS Code at any time." },
  { q: "Is creating a campaign free?", a: "Yes — creating and listing a campaign is 100% free. You only spend budget when your ad wins an impression in the auction. No setup fees, no monthly charges, no minimum commitment." },
];

const UPCOMING_PLATFORMS = [
  { name: "Cursor", desc: "AI-native editor with inline agent mode", category: "Editor", color: "#6366f1", letter: "C", status: "Q3 2026" },
  { name: "Codex CLI", desc: "OpenAI's command-line coding agent", category: "CLI", color: "#10b981", letter: "X", status: "Q3 2026" },
  { name: "Gemini CLI", desc: "Google's AI coding tool for the terminal", category: "CLI", color: "#4285f4", letter: "G", status: "Q4 2026" },
  { name: "Aider", desc: "AI pair programmer that edits your local repo", category: "Terminal", color: "#f59e0b", letter: "A", status: "Q4 2026" },
  { name: "OpenCode", desc: "Open-source terminal AI coding assistant", category: "Open Source", color: "#64748b", letter: "O", status: "2027" },
  { name: "Windsurf", desc: "Codeium's editor with agentic Cascade", category: "Editor", color: "#22d3ee", letter: "W", status: "Q3 2026" },
  { name: "Continue.dev", desc: "Open-source assistant for VS Code & JetBrains", category: "Extension", color: "#8b5cf6", letter: "↩", status: "Q4 2026" },
];

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: "vikram_k",   loc: "🇮🇳", initials: "VK", grad: "from-violet-500 to-purple-600", earned: 284.50, impressions: 63220 },
  { rank: 2, name: "alex_codes", loc: "🇺🇸", initials: "AC", grad: "from-blue-500 to-cyan-500",    earned: 218.30, impressions: 48510 },
  { rank: 3, name: "priya_dev",  loc: "🇮🇳", initials: "PD", grad: "from-amber-500 to-orange-500", earned: 196.80, impressions: 43730 },
];

const SAMPLE_CAMPAIGNS = [
  { brand: "Ramp", color: "#22c55e", letter: "R", badge: "bg-green-500/10 border-green-500/25 text-green-400", tagline: "Stop wasting money on SaaS. Ramp cuts spend automatically.", cpm: "$6.20", impressions: "14.2K", category: "Fintech" },
  { brand: "Linear", color: "#6366f1", letter: "L", badge: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400", tagline: "The issue tracker built for modern software teams.", cpm: "$5.80", impressions: "11.8K", category: "Productivity" },
  { brand: "Vercel", color: "#ffffff", letter: "▲", badge: "bg-white/5 border-white/15 text-white/70", tagline: "Deploy instantly. Scale automatically. Ship faster.", cpm: "$7.40", impressions: "18.6K", category: "DevOps" },
  { brand: "Warp", color: "#facc15", letter: "W", badge: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400", tagline: "The AI-native terminal for developer teams.", cpm: "$4.90", impressions: "9.3K", category: "Tools" },
  { brand: "PlanetScale", color: "#a78bfa", letter: "P", badge: "bg-violet-500/10 border-violet-500/25 text-violet-400", tagline: "The database platform designed for developer velocity.", cpm: "$5.50", impressions: "8.7K", category: "Database" },
  { brand: "Resend", color: "#fb923c", letter: "R", badge: "bg-orange-500/10 border-orange-500/25 text-orange-400", tagline: "Email for developers. Built for speed and reliability.", cpm: "$4.20", impressions: "7.1K", category: "API" },
];

// ─── Navbar ────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 h-16"
      style={{ borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(20px)", background: "rgba(10,10,10,0.85)" }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-full flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:bg-blue-500 transition-colors">
            <span className="text-sm font-black text-white leading-none">S</span>
          </div>
          <span className="text-[15px] font-bold tracking-[-0.02em] text-white">SpinEarn</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          {[
            { label: "Product", href: "#features" },
            { label: "Developers", href: "#how-it-works" },
            { label: "Campaigns", href: "#campaigns" },
            { label: "Roadmap", href: "#roadmap" },
            { label: "Leaderboard", href: "/leaderboard" },
            { label: "Stats", href: "/stats" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-[14px] font-medium text-white/55 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-150"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            className="px-4 py-2 text-[14px] font-medium text-white/55 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all duration-150 shadow-lg shadow-blue-500/20 hover:-translate-y-px active:translate-y-0"
          >
            Get started →
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors text-white/60"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4.5" width="12" height="1.5" rx="0.75" fill="currentColor"/><rect x="2" y="10" width="12" height="1.5" rx="0.75" fill="currentColor"/></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t px-5 py-4 space-y-1"
          style={{ borderColor: C.border, background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)" }}
        >
          {[
              { label: "Product", href: "#features" },
              { label: "Developers", href: "#how-it-works" },
              { label: "Campaigns", href: "#campaigns" },
              { label: "Roadmap", href: "#roadmap" },
              { label: "Leaderboard", href: "/leaderboard" },
              { label: "Stats", href: "/stats" },
            ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-[15px] font-medium text-white/60 hover:text-white rounded-xl hover:bg-white/[0.04] transition-all"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 grid grid-cols-2 gap-2.5">
            <Link href="/login" onClick={() => setOpen(false)} className="flex items-center justify-center py-3 rounded-xl text-[14px] font-semibold border text-white/70 hover:text-white transition-all" style={{ borderColor: C.border }}>Sign in</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center justify-center py-3 rounded-xl text-[14px] font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all">Get started →</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37,99,235,0.14), transparent 70%)" }} />
      <div className="absolute inset-0 bg-dots-subtle opacity-100 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium text-white/55 mb-8 sm:mb-10 border" style={{ borderColor: C.border, background: "rgba(255,255,255,0.03)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          Now in early access · 312+ developers earning
        </div>

        {/* Headline */}
        <h1 className="text-[3rem] sm:text-[4.25rem] lg:text-[5.5rem] font-bold tracking-[-0.04em] leading-[1.03] text-white mb-5 sm:mb-6">
          Turn AI thinking time<br className="hidden sm:block" />
          {" "}into{" "}
          <span className="gradient-text">passive income</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[1.0625rem] sm:text-[1.1875rem] text-white/52 max-w-[38rem] mx-auto mb-9 sm:mb-11 leading-[1.68] font-[450]">
          SpinEarn shows sponsor messages in Claude Code spinners.
          Developers earn <strong className="text-white/80 font-semibold">50% of every CPM</strong> — passively,
          while they code.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 sm:mb-20">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] transition-all duration-150 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px active:translate-y-0"
            >
              Start earning free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link
              href="/advertise/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white/70 hover:text-white font-semibold text-[15px] transition-all duration-150 border hover:bg-white/[0.05]"
              style={{ borderColor: C.border }}
            >
              Run an ad
            </Link>
        </div>

        {/* Product demo */}
        <FadeIn delay={260} y={40}>
          <div className="relative">
            <div className="absolute -inset-px rounded-[20px] opacity-50 blur-3xl pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(37,99,235,0.22), transparent)" }} />
            <SpinnerDemo />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Stats bar ─────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: "1.2M+", label: "Impressions served" },
    { value: "$24K+", label: "Developer payouts" },
    { value: "180+", label: "Active campaigns" },
    { value: "$4.50", label: "Average CPM" },
  ];

  return (
    <section className="border-y py-14" style={{ borderColor: C.border }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 55} className="text-center">
              <p className="text-[2.25rem] sm:text-[2.75rem] font-bold tracking-[-0.04em] text-white leading-none mb-2">
                {stat.value}
              </p>
              <p className="text-[13px] font-medium text-white/38">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-[36rem] mx-auto mb-16 sm:mb-20">
          <FadeIn>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">Features</p>
          </FadeIn>
          <FadeIn delay={60}>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              Everything you need to monetize
            </h2>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-[1.0625rem] text-white/50 leading-relaxed">
              A complete platform for developers to earn from AI tool usage and for advertisers to reach them precisely.
            </p>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 50}>
              <div
                className="group relative p-6 sm:p-7 rounded-2xl h-full flex flex-col transition-all duration-200 cursor-default border"
                style={{
                  background: C.surface,
                  borderColor: C.border,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              >
                <span className="text-[2rem] mb-5 block" aria-hidden="true">{feature.icon}</span>
                <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-white mb-2.5">{feature.title}</h3>
                <p className="text-[14px] text-white/48 leading-relaxed flex-1">{feature.desc}</p>
                <p className="text-[13px] text-blue-400/75 font-medium mt-4">{feature.metric}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────
function HowItWorks() {
  const [tab, setTab] = useState<"developer" | "advertiser">("developer");
  const steps = tab === "developer" ? DEV_STEPS : ADV_STEPS;

  return (
    <section id="how-it-works" className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-[34rem] mx-auto mb-14">
          <FadeIn>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">How it works</p>
          </FadeIn>
          <FadeIn delay={60}>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              Simple by design
            </h2>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-[1.0625rem] text-white/50 leading-relaxed">
              Whether you're a developer earning or an advertiser reaching — four steps is all it takes.
            </p>
          </FadeIn>
        </div>

        {/* Tab toggle */}
        <FadeIn delay={80} className="flex justify-center mb-14">
          <div
            className="flex gap-1 p-1 rounded-[14px] border"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: C.border }}
          >
            {(["developer", "advertiser"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-[10px] text-[14px] font-semibold transition-all duration-200 ${
                  tab === t
                    ? "bg-white text-[#0a0a0a] shadow-sm"
                    : "text-white/48 hover:text-white/75"
                }`}
              >
                {t === "developer" ? "For developers" : "For advertisers"}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Steps */}
        <div key={tab} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, i) => (
            <FadeIn key={step.n} delay={i * 70}>
              <div className="flex flex-col">
                <p className="text-[3.5rem] font-bold tracking-[-0.06em] text-white/[0.07] leading-none mb-5 select-none">
                  {step.n}
                </p>
                <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-white mb-2.5">{step.title}</h3>
                <p className="text-[14px] text-white/48 leading-relaxed">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Earnings calculator ───────────────────────────────────────
function EarningsCalculator() {
  const [hours, setHours] = useState(4);
  const sliderId = useId();
  const IMPRESSIONS = 50;
  const CPM = 4.5;
  const DAYS = 22;
  const monthly = hours * IMPRESSIONS * DAYS * (CPM / 1000) * 0.5;
  const annual = monthly * 12;

  return (
    <section className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">Earnings estimator</p>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              How much will you earn?
            </h2>
            <p className="text-[1.0625rem] text-white/50 leading-relaxed mb-8">
              Based on {IMPRESSIONS} impressions per hour at ${CPM} CPM with 50% developer share across {DAYS} working days.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] transition-all duration-150 shadow-lg shadow-blue-500/20 hover:-translate-y-px"
            >
              Start earning free →
            </Link>
          </div>

          <FadeIn delay={80}>
            <div className="rounded-2xl p-7 sm:p-8 border" style={{ background: C.surface, borderColor: C.border }}>
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor={sliderId} className="text-[14px] font-medium text-white/65">
                    Hours/day using Claude Code
                  </label>
                  <span className="text-[1.125rem] font-bold text-white tabular-nums" aria-live="polite">
                    {hours}h
                  </span>
                </div>
                <div className="relative pt-7">
                  <div
                    className="absolute top-0 -translate-x-1/2 px-2 py-1 rounded-md bg-blue-600 text-white text-[11px] font-bold tabular-nums pointer-events-none select-none"
                    style={{ left: `calc(${((hours - 1) / 11) * 100}% + ${8 - ((hours - 1) / 11) * 16}px)` }}
                    aria-hidden="true"
                  >
                    {hours}h
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600" />
                  </div>
                  <input
                    id={sliderId}
                    type="range"
                    min={1}
                    max={12}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    aria-valuetext={`${hours} ${hours === 1 ? "hour" : "hours"} per day`}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
                    style={{ background: `linear-gradient(to right, #2563eb ${((hours - 1) / 11) * 100}%, rgba(255,255,255,0.1) ${((hours - 1) / 11) * 100}%)` }}
                  />
                </div>
                <div className="flex justify-between text-[12px] text-white/28 mt-2">
                  <span>1h</span><span>12h</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="rounded-xl p-4 sm:p-5 border" style={{ background: C.surface2, borderColor: C.border }}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38 mb-2">Monthly</p>
                  <p className="text-[2rem] font-bold tracking-[-0.04em] text-blue-300 tabular-nums" aria-live="polite">
                    ${monthly.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl p-4 sm:p-5 border" style={{ background: C.surface2, borderColor: C.border }}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/38 mb-2">Annual</p>
                  <p className="text-[2rem] font-bold tracking-[-0.04em] text-emerald-300 tabular-nums" aria-live="polite">
                    ${annual.toFixed(0)}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-white/28 mt-4 leading-relaxed">
                Estimates based on current platform averages. Actual earnings depend on advertiser demand and auction competition.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── Campaigns ─────────────────────────────────────────────────
function CampaignsSection() {
  return (
    <section id="campaigns" className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div className="max-w-[34rem]">
            <FadeIn>
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">Live campaigns</p>
            </FadeIn>
            <FadeIn delay={60}>
              <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
                Brands competing for your attention
              </h2>
            </FadeIn>
            <FadeIn delay={120}>
              <p className="text-[1.0625rem] text-white/50 leading-relaxed">
                These are the types of campaigns running right now in developer spinners.
                Creating a campaign is <span className="text-white/80 font-semibold">always free</span> — you only spend when you win an impression.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={80}>
            <Link
              href="/advertise/new"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] transition-all duration-150 shadow-lg shadow-blue-500/20 hover:-translate-y-px whitespace-nowrap"
            >
              Launch free campaign →
            </Link>
          </FadeIn>
        </div>

        {/* Free banner */}
        <FadeIn delay={40}>
          <div
            className="flex flex-wrap items-center gap-4 px-5 py-4 rounded-2xl mb-10 border border-blue-500/20"
            style={{ background: "rgba(37,99,235,0.07)" }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-base">🎉</div>
              <p className="text-[14px] font-semibold text-white">Campaigns are 100% free to create</p>
            </div>
            <div className="h-px sm:h-5 sm:w-px w-full bg-white/[0.08]" />
            {["No setup fee", "No monthly charge", "No minimum bid", "Instant activation"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/55">
                <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {item}
              </span>
            ))}
          </div>
        </FadeIn>

        {/* Campaign cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SAMPLE_CAMPAIGNS.map((c, i) => (
            <FadeIn key={c.brand} delay={i * 50}>
              <div
                className="group relative p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col gap-4"
                style={{ background: C.surface, borderColor: C.border }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              >
                {/* Brand row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                      style={{ background: `${c.color}15`, border: `1px solid ${c.color}30`, color: c.color }}
                    >
                      {c.letter}
                    </div>
                    <span className="text-[14px] font-semibold text-white">{c.brand}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${c.badge}`}>
                    {c.category}
                  </span>
                </div>

                {/* Ad copy */}
                <p className="text-[13px] text-white/55 leading-relaxed font-mono border-l-2 border-white/[0.08] pl-3">
                  &ldquo;{c.tagline}&rdquo;
                </p>

                {/* Metrics */}
                <div className="flex items-center gap-4 pt-1 border-t" style={{ borderColor: C.border }}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/28 mb-0.5">CPM bid</p>
                    <p className="text-[15px] font-bold text-white tabular-nums">{c.cpm}</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.07]" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/28 mb-0.5">Impressions</p>
                    <p className="text-[15px] font-bold text-white tabular-nums">{c.impressions}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                      Live
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Bottom CTA */}
        <FadeIn delay={100}>
          <div className="text-center mt-12">
            <p className="text-[14px] text-white/38 mb-4 font-medium">Want your brand here? It's free to start.</p>
            <Link
              href="/advertise/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border text-[14px] font-semibold text-white/65 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
              style={{ borderColor: C.border }}
            >
              Create your first campaign →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Leaderboard strip ────────────────────────────────────────
function LeaderboardStrip() {
  const RANK_RING = ["ring-amber-400/40", "ring-slate-400/30", "ring-amber-700/35"];
  const RANK_LABEL = ["🥇", "🥈", "🥉"];
  const RANK_COLOR = ["text-amber-400", "text-slate-300", "text-amber-600"];

  return (
    <section className="py-16 sm:py-20 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <FadeIn>
            <div>
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-1">Leaderboard</p>
              <h2 className="text-[1.5rem] sm:text-[1.875rem] font-bold tracking-[-0.03em] text-white leading-tight">
                Top earners this month
              </h2>
            </div>
          </FadeIn>
          <FadeIn delay={60}>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/50 hover:text-white transition-colors shrink-0"
            >
              Full leaderboard
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-3 gap-3.5">
          {LEADERBOARD_PREVIEW.map((e, i) => (
            <FadeIn key={e.rank} delay={i * 60}>
              <div
                className="relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 hover:bg-white/[0.025]"
                style={{ background: C.surface, borderColor: C.border }}
              >
                {/* Rank medal */}
                <span className="text-xl shrink-0" aria-hidden="true">{RANK_LABEL[i]}</span>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${e.grad} flex items-center justify-center text-[12px] font-bold text-white shrink-0 ring-2 ${RANK_RING[i]}`}>
                  {e.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-white truncate">{e.name}</p>
                    <span className="text-[13px]">{e.loc}</span>
                  </div>
                  <p className="text-[12px] text-white/35 font-medium">
                    {(e.impressions / 1000).toFixed(1)}K impressions
                  </p>
                </div>

                {/* Earnings */}
                <div className="text-right shrink-0">
                  <p className={`text-[1.125rem] font-bold tabular-nums ${RANK_COLOR[i]}`}>
                    ${e.earned.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-white/25 font-medium">this month</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={120}>
          <div className="mt-5 text-center">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/38 hover:text-white/70 transition-colors"
            >
              View all rankings →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────
function Testimonials() {
  return (
    <section className="py-24 sm:py-32 border-t overflow-hidden" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-[34rem] mx-auto mb-14 sm:mb-18">
          <FadeIn>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">What developers say</p>
          </FadeIn>
          <FadeIn delay={60}>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              Loved by the community
            </h2>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 50}>
              <div
                className="p-6 sm:p-7 rounded-2xl h-full flex flex-col border transition-all duration-200"
                style={{ background: C.surface, borderColor: C.border }}
              >
                <p className="text-[14px] text-white/58 leading-[1.7] flex-1 mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white tracking-[-0.01em]">{t.name}</p>
                    <p className="text-[12px] text-white/35">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <FadeIn>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">FAQ</p>
          </FadeIn>
          <FadeIn delay={60}>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              Common questions
            </h2>
          </FadeIn>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <FadeIn key={i} delay={i * 40}>
              <div className="rounded-xl overflow-hidden border" style={{ background: C.surface, borderColor: C.border }}>
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  aria-expanded={openIdx === i}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-[15px] font-medium text-white tracking-[-0.01em]">{item.q}</span>
                  <span
                    className="text-white/60 shrink-0 text-lg font-bold leading-none transition-transform duration-200 select-none"
                    style={{ transform: openIdx === i ? "rotate(45deg)" : "rotate(0)" }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: openIdx === i ? "600px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease",
                    opacity: openIdx === i ? 1 : 0,
                  }}
                >
                  <p className="px-5 pb-5 text-[14px] text-white/48 leading-[1.7]">{item.a}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA section ───────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <FadeIn>
          <h2 className="text-[2.5rem] sm:text-[3.5rem] lg:text-[4.5rem] font-bold tracking-[-0.04em] text-white leading-[1.04] mb-5 sm:mb-6">
            Start earning<br className="hidden sm:block" /> while you code
          </h2>
        </FadeIn>
        <FadeIn delay={60}>
          <p className="text-[1.0625rem] sm:text-[1.125rem] text-white/48 mb-10 max-w-[28rem] mx-auto leading-relaxed">
            Join 312+ developers turning their AI tool usage into passive income. Free to join — no credit card required.
          </p>
        </FadeIn>
        <FadeIn delay={120}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] transition-all duration-150 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px"
            >
              Start earning free →
            </Link>
            <Link
              href="/advertise/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white/60 hover:text-white font-semibold text-[15px] transition-all duration-150 border hover:bg-white/[0.04]"
              style={{ borderColor: C.border }}
            >
              Run an ad
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      title: "Product",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Earnings", href: "/dashboard/earnings" },
        { label: "Payouts", href: "/dashboard/payouts" },
      ],
    },
    {
      title: "Advertise",
      links: [
        { label: "Campaigns", href: "/advertise" },
        { label: "New campaign", href: "/advertise/new" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/legal/privacy" },
        { label: "Terms of Service", href: "/legal/terms" },
      ],
    },
  ];

  return (
    <footer className="border-t py-14 sm:py-16" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-[10px] bg-blue-600 flex items-center justify-center">
                <span className="text-xs font-black text-white leading-none">S</span>
              </div>
              <span className="text-[15px] font-bold tracking-[-0.02em]">SpinEarn</span>
            </Link>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-[180px]">Passive income for developers. Powered by AI tool activity.</p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/28 mb-4">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[14px] text-white/45 hover:text-white transition-colors duration-150 font-medium">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: C.border }}>
          <p className="text-[13px] text-white/25 font-medium">© 2026 SpinEarn. All rights reserved.</p>
          <p className="text-[13px] text-white/25 font-medium">Built for developers, by developers.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Referral box (inside roadmap) ────────────────────────────
function ReferralBox() {
  const tiers = [
    { refs: 1, reward: "Hold your spot in the queue" },
    { refs: 3, reward: "Priority access to the next platform launch" },
    { refs: 5, reward: "Beta tester badge + direct feedback channel" },
  ];

  return (
    <div
      className="rounded-2xl border mb-6 overflow-hidden"
      style={{ background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.18)" }}
    >
      <div className="px-7 py-6 sm:py-8 flex flex-col sm:flex-row gap-8 items-start sm:items-center">
        {/* Left — copy */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-emerald-400 mb-2">
            Refer &amp; unlock
          </p>
          <h3 className="text-[1.25rem] sm:text-[1.5rem] font-bold tracking-[-0.03em] text-white mb-2 leading-tight">
            Refer developers, earn early access
          </h3>
          <p className="text-[13px] text-white/45 mb-6 leading-relaxed max-w-[28rem]">
            Each developer you refer moves you up the launch queue. Platforms with the most referred users go live first.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-px"
          >
            Sign up to get your referral link →
          </a>
        </div>

        {/* Right — tiers */}
        <div
          className="w-full sm:w-auto sm:min-w-[220px] rounded-xl border p-4 space-y-3"
          style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(16,185,129,0.12)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-3">Referral tiers</p>
          {tiers.map((t) => (
            <div key={t.refs} className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-[11px] font-bold text-emerald-400 shrink-0 mt-px">
                {t.refs}
              </span>
              <p className="text-[12px] text-white/50 leading-snug font-medium">{t.reward}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming platforms ────────────────────────────────────────
function UpcomingPlatforms() {
  return (
    <section id="roadmap" className="py-24 sm:py-32 border-t" style={{ borderColor: C.border }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="text-center max-w-[38rem] mx-auto mb-14 sm:mb-18">
          <FadeIn>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-4">Platform roadmap</p>
          </FadeIn>
          <FadeIn delay={60}>
            <h2 className="text-[2.25rem] sm:text-[3rem] font-bold tracking-[-0.03em] text-white mb-4 leading-[1.08]">
              Beyond Claude Code
            </h2>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-[1.0625rem] text-white/50 leading-relaxed">
              SpinEarn starts with Claude Code. Every AI tool with a spinner or thinking pause is an opportunity.
              These platforms are next.
            </p>
          </FadeIn>
        </div>

        {/* Currently live banner */}
        <FadeIn delay={40}>
          <div
            className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-10 border border-emerald-500/20"
            style={{ background: "rgba(16,185,129,0.05)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-base shrink-0">⚡</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white">Claude Code — Live now</p>
              <p className="text-[13px] text-white/40">VS Code extension · Every tool-run spinner monetised · Install from the Marketplace</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              Available
            </span>
          </div>
        </FadeIn>

        {/* Divider with label */}
        <FadeIn delay={60}>
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px" style={{ background: C.border }} />
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/25 shrink-0">Coming soon</p>
            <div className="flex-1 h-px" style={{ background: C.border }} />
          </div>
        </FadeIn>

        {/* Platform grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-12">
          {UPCOMING_PLATFORMS.map((platform, i) => (
            <FadeIn key={platform.name} delay={i * 45}>
              <div
                className="group relative p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3.5 opacity-90 hover:opacity-100"
                style={{ background: C.surface, borderColor: C.border }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0 transition-transform duration-200 group-hover:scale-105"
                      style={{ background: `${platform.color}18`, border: `1px solid ${platform.color}30`, color: platform.color }}
                    >
                      {platform.letter}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">{platform.name}</p>
                      <p
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md inline-block mt-0.5"
                        style={{ background: `${platform.color}12`, color: `${platform.color}cc` }}
                      >
                        {platform.category}
                      </p>
                    </div>
                  </div>

                  {/* Coming soon badge */}
                  <span
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap shrink-0 border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: C.border, color: "rgba(255,255,255,0.3)" }}
                  >
                    {platform.status}
                  </span>
                </div>

                <p className="text-[13px] text-white/42 leading-relaxed">{platform.desc}</p>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: C.border }}>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-1 rounded-full transition-all duration-700"
                      style={{
                        width: platform.status === "Q3 2026" ? "35%" : platform.status === "Q4 2026" ? "15%" : "5%",
                        background: `linear-gradient(90deg, ${platform.color}60, ${platform.color}30)`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-white/22 font-medium shrink-0">In development</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Referral section */}
        <FadeIn delay={80}>
          <ReferralBox />
        </FadeIn>

        {/* Bottom CTA */}
        <FadeIn delay={100}>
          <div
            className="rounded-2xl border p-7 sm:p-9 text-center"
            style={{ background: "rgba(37,99,235,0.05)", borderColor: "rgba(37,99,235,0.18)" }}
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-blue-400 mb-3">Want your tool supported next?</p>
            <h3 className="text-[1.5rem] sm:text-[1.875rem] font-bold tracking-[-0.03em] text-white mb-3 leading-tight">
              Using Cursor, Windsurf, or another AI editor?
            </h3>
            <p className="text-[14px] text-white/45 mb-7 max-w-[32rem] mx-auto leading-relaxed">
              Sign up and tell us which tool you use every day. Platforms with the most developer demand ship first.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] transition-all duration-150 shadow-lg shadow-blue-500/20 hover:-translate-y-px"
              >
                Join the waitlist →
              </a>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white/55 hover:text-white font-semibold text-[14px] transition-all duration-150 border hover:bg-white/[0.04]"
                style={{ borderColor: C.border }}
              >
                See how it works
              </a>
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <HowItWorks />
        <EarningsCalculator />
        <CampaignsSection />
        <UpcomingPlatforms />
        <LeaderboardStrip />
        <Testimonials />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
