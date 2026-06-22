"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Props {
  balance: {
    pending_balance: string;
    paid_balance: string;
    today_earned: string;
    week_earned: string;
    hourly_cap_cents: number;
    daily_cap_cents: number;
  };
}

const BORDER = "rgba(255,255,255,0.08)";

export function BalanceCard({ balance }: Props) {
  const pendingUSD = parseFloat(balance.pending_balance);
  const paidUSD = parseFloat(balance.paid_balance);
  const todayUSD = parseFloat(balance.today_earned);
  const weekUSD = parseFloat(balance.week_earned);
  const dailyCapUSD = balance.daily_cap_cents / 100;
  const hourlyCapUSD = balance.hourly_cap_cents / 100;
  const dailyProgress = dailyCapUSD > 0 ? Math.min((todayUSD / dailyCapUSD) * 100, 100) : 0;
  const lifetimeUSD = pendingUSD + paidUSD;
  const paidPct = lifetimeUSD > 0 ? Math.min((paidUSD / lifetimeUSD) * 100, 100) : 0;
  const weekDailyAvg = weekUSD / 7;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">

      {/* Available balance */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 border border-blue-500/20"
        style={{ background: "rgba(37,99,235,0.08)" }}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-blue-400 mb-3">Available</p>
        <p className="text-[2.5rem] font-bold text-white font-mono tabular-nums leading-none mb-1.5">
          {formatCurrency(pendingUSD)}
        </p>
        <p className="text-[13px] text-white/38 font-medium">
          {formatCurrency(paidUSD)} paid out lifetime
        </p>
        {pendingUSD >= 10 ? (
          <Link
            href="/dashboard/payouts"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[13px] font-semibold transition-all text-white shadow-lg shadow-blue-500/20"
          >
            Withdraw →
          </Link>
        ) : (
          <p className="mt-4 text-[12px] text-white/25">
            {formatCurrency(Math.max(0, 10 - pendingUSD))} more to unlock
          </p>
        )}
      </div>

      {/* Today */}
      <div className="relative rounded-2xl p-6 overflow-hidden border" style={{ background: "#111111", borderColor: BORDER }}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/38 mb-3">Today</p>
        <p className="text-[2.5rem] font-bold text-white font-mono tabular-nums leading-none mb-4">
          {formatCurrency(todayUSD)}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-white/38 font-medium">Daily cap usage</span>
            <span className={`text-[12px] font-bold tabular-nums ${dailyProgress > 85 ? "text-amber-400" : dailyProgress > 50 ? "text-blue-400" : "text-white/60"}`}>
              {dailyProgress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${dailyProgress > 85 ? "bg-amber-400" : "bg-blue-500"}`}
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <p className="text-[12px] text-white/25 tabular-nums font-medium">{formatCurrency(dailyCapUSD)} cap/day</p>
        </div>
      </div>

      {/* 7-Day */}
      <div className="relative rounded-2xl p-6 overflow-hidden border" style={{ background: "#111111", borderColor: BORDER }}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/38 mb-3">7-Day</p>
        <p className="text-[2.5rem] font-bold text-white font-mono tabular-nums leading-none mb-1.5">
          {formatCurrency(weekUSD)}
        </p>
        <p className="text-[13px] text-white/55 font-medium">
          avg {formatCurrency(weekDailyAvg)}<span className="text-white/28">/day</span>
        </p>
        <p className="text-[12px] text-white/28 mt-1 font-medium">{formatCurrency(hourlyCapUSD)}/hr cap</p>
      </div>

      {/* Lifetime */}
      <div className="relative rounded-2xl p-6 overflow-hidden border" style={{ background: "#111111", borderColor: BORDER }}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/38 mb-3">Lifetime</p>
        <p className="text-[2.5rem] font-bold text-white font-mono tabular-nums leading-none mb-3.5">
          {formatCurrency(lifetimeUSD)}
        </p>
        <div className="space-y-2">
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-emerald-400 tabular-nums font-medium">{formatCurrency(paidUSD)} paid</span>
            <span className="text-white/35 tabular-nums font-medium">{formatCurrency(pendingUSD)} pending</span>
          </div>
        </div>
      </div>

    </div>
  );
}
