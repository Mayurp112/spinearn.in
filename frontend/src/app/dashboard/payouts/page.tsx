"use client";

import { useQuery } from "@tanstack/react-query";
import { PayoutForm } from "@/components/dashboard/PayoutForm";
import RazorpayPayoutSetup from "@/components/payment/RazorpayPayoutSetup";
import WisePayoutSetup from "@/components/payment/WisePayoutSetup";
import { api } from "@/lib/api";

import { formatCurrency, formatDate, payoutStatusColor, payoutStatusDot } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";


export default function PayoutsPage() {
  const token = useAuthStore((s) => s.accessToken);

  const balanceQuery = useQuery({
    queryKey: ["developer", "balance"],
    queryFn: () => api.developer.balance(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const payoutsQuery = useQuery({
    queryKey: ["developer", "payouts"],
    queryFn: () => api.developer.payouts(token!),
    enabled: !!token,
  });

  const providerQuery = useQuery({
    queryKey: ["payout-provider"],
    queryFn: () => api.payoutProvider.get(token!),
    enabled: !!token,
  });

  const provider = providerQuery.data?.provider ?? "razorpay";
  const isOnboarded = providerQuery.data?.onboarded ?? false;
  const isIndia = provider === "razorpay";
  const isWise = provider === "wise";

  const paidLifetime = balanceQuery.data ? parseFloat(balanceQuery.data.paid_balance) : 0;
  const pending = balanceQuery.data ? parseFloat(balanceQuery.data.pending_balance) : 0;

  if (!token) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <span className="text-2xl font-black text-white" aria-hidden="true">S</span>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to manage payouts</h2>
        <p className="text-slate-400 text-sm">Withdraw your earnings and view transfer history</p>
      </div>
      <a href="/login" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 text-white">
        Sign in →
      </a>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payouts</h1>
        <p className="text-slate-500 text-sm mt-0.5">Withdraw earnings and track transfer history</p>
      </div>

      {/* Balance hero + form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Balance hero */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-900 p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4">Available Balance</p>
          {balanceQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-10 w-40 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
            </div>
          ) : balanceQuery.data ? (
            <>
              <p className="text-5xl font-bold text-white font-mono tabular-nums leading-none mb-2">
                {formatCurrency(pending)}
              </p>
              <p className="text-slate-500 text-sm">
                {formatCurrency(paidLifetime)} total paid out to date
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">Today</p>
                  <p className="text-xl font-bold text-white font-mono tabular-nums">
                    {formatCurrency(balanceQuery.data.today_earned)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-1">This Week</p>
                  <p className="text-xl font-bold text-white font-mono tabular-nums">
                    {formatCurrency(balanceQuery.data.week_earned)}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Payout setup / form */}
        {isIndia && !isOnboarded ? (
          <RazorpayPayoutSetup onComplete={() => providerQuery.refetch()} />
        ) : isWise && !isOnboarded ? (
          <WisePayoutSetup onComplete={() => providerQuery.refetch()} />
        ) : (
          <PayoutForm
            balance={balanceQuery.data}
            token={token ?? ""}
            onSuccess={() => {
              balanceQuery.refetch();
              payoutsQuery.refetch();
            }}
          />
        )}
      </div>

      {/* Payout history */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4 px-1">Transfer History</p>

        {payoutsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : payoutsQuery.data?.payouts.length ? (
          <div className="space-y-3">
            {payoutsQuery.data.payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${payoutStatusDot(payout.status)}`} />
                  <div className="min-w-0">
                    <p className="text-white font-semibold font-mono tabular-nums text-lg">
                      {formatCurrency(payout.amount_cents / 100)}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">
                      Requested {formatDate(payout.requested_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {payout.completed_at && (
                    <p className="text-slate-500 text-xs hidden sm:block">
                      Completed {formatDate(payout.completed_at)}
                    </p>
                  )}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${payoutStatusColor(payout.status)}`}>
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/50">
            <p className="text-slate-500 text-sm">No payouts yet</p>
            <p className="text-slate-600 text-xs mt-1">Request your first payout when you reach $10</p>
          </div>
        )}
      </div>

    </div>
  );
}
