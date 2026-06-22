"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { api } from "@/lib/api";

import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <span className="text-2xl font-black text-white" aria-hidden="true">S</span>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to view your dashboard</h2>
        <p className="text-slate-400 text-sm">Track your earnings, referrals, and payout history</p>
      </div>
      <a
        href="/login"
        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 text-white"
      >
        Sign in →
      </a>
    </div>
  );
}

export default function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [copied, setCopied] = useState(false);

  const balanceQuery = useQuery({
    queryKey: ["developer", "balance"],
    queryFn: () => api.developer.balance(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const earningsQuery = useQuery({
    queryKey: ["developer", "earnings", "week"],
    queryFn: () => api.developer.earnings(token!, "week"),
    enabled: !!token,
  });

  const referralQuery = useQuery({
    queryKey: ["developer", "referral"],
    queryFn: () => api.referral.get(token!),
    enabled: !!token,
  });

  const handleCopyReferral = () => {
    if (referralQuery.data?.referral_url) {
      navigator.clipboard.writeText(referralQuery.data.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const weekEarned = earningsQuery.data ? parseFloat(earningsQuery.data.total_earned) : null;

  if (!token) return <SignInPrompt />;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.03em] text-white">Overview</h1>
          <p className="text-white/45 text-[14px] mt-0.5 font-medium">Your earnings command center</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium text-white/35 border" style={{ background: "#111111", borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          Live · 30s refresh
        </div>
      </div>

      {/* KPI scorecards */}
      {balanceQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : balanceQuery.data ? (
        <BalanceCard balance={balanceQuery.data} />
      ) : null}

      {/* Revenue chart + Insights grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/35">7-Day Revenue</p>
            <Link href="/dashboard/earnings" className="text-[13px] text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Full analytics →
            </Link>
          </div>
          {earningsQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-56 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="h-44 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ) : earningsQuery.data ? (
            <EarningsChart data={earningsQuery.data} />
          ) : null}
        </div>

        {/* Intelligence panel */}
        <div className="rounded-2xl p-6 flex flex-col border" style={{ background: "#111111", borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/35 mb-4">Intelligence</p>
          <div className="space-y-3 flex-1">
            <InsightCard
              accent="blue"
              icon="📈"
              title="Revenue trajectory"
              body={
                weekEarned !== null
                  ? `${formatCurrency(weekEarned)} earned this week. Avg ${formatCurrency(weekEarned / 7)}/day.`
                  : "Start receiving impressions to build your revenue trend."
              }
            />
            <InsightCard
              accent="violet"
              icon="👥"
              title="Referral opportunity"
              body={`${referralQuery.data?.referral_count ?? 0} developer(s) referred. Each earns you $1 on their first impression.`}
            />
            <InsightCard
              accent="emerald"
              icon="💳"
              title="Payout readiness"
              body={
                balanceQuery.data && parseFloat(balanceQuery.data.pending_balance) >= 10
                  ? `${formatCurrency(parseFloat(balanceQuery.data.pending_balance))} available — you can withdraw now.`
                  : "Earn $10+ to unlock your first payout via Stripe Connect."
              }
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/35 mb-3 px-1">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { href: "/dashboard/payouts", title: "Request Payout", sub: "Withdraw via Stripe or Razorpay", arrow: "text-blue-400" },
            { href: "/advertise", title: "Run an Ad", sub: "Reach thousands of developers", arrow: "text-violet-400" },
            { href: "/dashboard/earnings", title: "Deep Analytics", sub: "Hourly · daily · monthly · yearly", arrow: "text-emerald-400" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-between p-5 rounded-2xl transition-all group border hover:bg-white/[0.03]"
              style={{ background: "#111111", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div>
                <p className="text-[14px] font-semibold text-white">{action.title}</p>
                <p className="text-[13px] text-white/40 mt-0.5 font-medium">{action.sub}</p>
              </div>
              <span className={`text-lg ${action.arrow} group-hover:translate-x-1 transition-transform`}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Referral program */}
      <div className="rounded-2xl p-6 border" style={{ background: "#111111", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/35 mb-1">Referral Program</p>
            <h3 className="text-[15px] font-semibold text-white tracking-[-0.01em]">Earn $1 per referred developer</h3>
            <p className="text-white/45 text-[13px] mt-1 max-w-sm font-medium">
              Bonus triggers when a referred developer receives their first impression.
            </p>
          </div>
          {referralQuery.data && (
            <div className="shrink-0 flex gap-6">
              <div className="text-right">
                <p className="text-[1.75rem] font-bold text-white font-mono tabular-nums leading-none">{referralQuery.data.referral_count}</p>
                <p className="text-white/30 text-[12px] mt-1 font-medium">referred</p>
              </div>
              {referralQuery.data.total_bonus_cents > 0 && (
                <div className="text-right">
                  <p className="text-[1.75rem] font-bold text-emerald-400 font-mono tabular-nums leading-none">
                    +{formatCurrency(referralQuery.data.total_bonus_cents / 100)}
                  </p>
                  <p className="text-white/30 text-[12px] mt-1 font-medium">bonus earned</p>
                </div>
              )}
            </div>
          )}
        </div>

        {referralQuery.isLoading ? (
          <div className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ) : referralQuery.data ? (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="text-white/38 text-[12px] font-mono truncate flex-1 select-all">
              {referralQuery.data.referral_url}
            </span>
            <button
              onClick={handleCopyReferral}
              className={`shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                copied ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {copied ? "✓ Copied" : "Copy link"}
            </button>
          </div>
        ) : null}
      </div>

    </div>
  );
}

function InsightCard({
  icon,
  accent,
  title,
  body,
}: {
  icon: string;
  accent: "blue" | "violet" | "emerald";
  title: string;
  body: string;
}) {
  const tc = { blue: "text-blue-400", violet: "text-violet-400", emerald: "text-emerald-400" };
  const bc = { blue: "rgba(37,99,235,0.15)", violet: "rgba(124,58,237,0.15)", emerald: "rgba(16,185,129,0.15)" };
  const bb = { blue: "rgba(37,99,235,0.2)", violet: "rgba(124,58,237,0.2)", emerald: "rgba(16,185,129,0.2)" };
  return (
    <div className="rounded-xl p-3.5 flex gap-3 border" style={{ background: bc[accent], borderColor: bb[accent] }}>
      <span className="text-sm leading-none shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className={`text-[12px] font-semibold mb-1 ${tc[accent]}`}>{title}</p>
        <p className="text-white/55 text-[12px] leading-relaxed font-medium">{body}</p>
      </div>
    </div>
  );
}
