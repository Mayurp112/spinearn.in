"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "7 Days",
  month: "30 Days",
  year: "12 Months",
};

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <span className="text-2xl font-black text-white" aria-hidden="true">S</span>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to view earnings</h2>
        <p className="text-slate-400 text-sm">Access your impression and click revenue analytics</p>
      </div>
      <Link
        href="/login?callbackUrl=/dashboard/earnings"
        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20"
      >
        Sign in →
      </Link>
    </div>
  );
}

export default function EarningsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [period, setPeriod] = useState<Period>("week");

  const earningsQuery = useQuery({
    queryKey: ["developer", "earnings", period],
    queryFn: () => api.developer.earnings(token!, period),
    enabled: !!token,
  });

  if (!token) return <SignInPrompt />;

  const data = earningsQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Earnings</h1>
          <p className="text-slate-400 text-sm">Impression and click revenue over time</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {earningsQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-800 animate-pulse" />
          <div className="h-44 rounded-2xl bg-slate-800 animate-pulse" />
        </div>
      ) : data && parseFloat(data.total_earned) > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Earned"
              value={formatCurrency(data.total_earned)}
              highlight
            />
            <StatCard
              label="Impression Revenue"
              value={formatCurrency(data.impression_earned)}
              sublabel={`${data.impression_count.toLocaleString()} impressions`}
            />
            <StatCard
              label="Click Revenue"
              value={formatCurrency(data.click_earned)}
              sublabel={`${data.click_count.toLocaleString()} clicks`}
            />
            <StatCard
              label="Avg CPM"
              value={formatCurrency(data.avg_cpm)}
              sublabel="per 1,000 impressions"
            />
          </div>
          <EarningsChart data={data} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-800 bg-slate-900/50 gap-6 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center text-3xl" aria-hidden="true">
            💰
          </div>
          <div className="max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-2">No earnings yet for this period</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Install the SpinAds VS Code extension and use Claude Code or Codex as usual.
              Revenue appears here once impressions are confirmed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="vscode:extension/spinads.spinads"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all font-semibold text-sm shadow-lg shadow-blue-500/20"
            >
              Install Extension →
            </a>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=spinads.spinads"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all font-semibold text-sm text-slate-300"
            >
              View on Marketplace
            </a>
          </div>
          {/* Placeholder chart skeleton to show where data will appear */}
          <div className="w-full mt-2 space-y-3 opacity-30 pointer-events-none select-none" aria-hidden="true">
            <div className="h-48 rounded-2xl bg-slate-800 animate-pulse" />
            <div className="h-36 rounded-2xl bg-slate-800 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-xl border ${
        highlight
          ? "bg-blue-950 border-blue-700/50"
          : "bg-slate-900 border-slate-800"
      }`}
    >
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-blue-300" : "text-white"}`}>
        {value}
      </p>
      {sublabel && <p className="text-slate-500 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}
