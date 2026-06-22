"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, type DeveloperBalance } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  amount_usd: z.number().min(10, "Minimum payout is $10").max(10000),
});

type FormData = z.infer<typeof schema>;

interface Props {
  balance?: DeveloperBalance;
  token: string;
  onSuccess: () => void;
}

export function PayoutForm({ balance, token, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount_usd: 10 },
  });

  const payoutMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.payouts.request(Math.round(data.amount_usd * 100), token),
    onSuccess: () => {
      reset();
      onSuccess();
    },
  });

  const pendingBalance = balance ? parseFloat(balance.pending_balance) : 0;
  const canPayout = pendingBalance >= 10;
  const watchedAmount = watch("amount_usd") ?? 10;
  const remainingAfter = pendingBalance - (watchedAmount || 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Request Payout</p>
      <h2 className="text-base font-semibold text-white mb-5">Withdraw your earnings</h2>

      {!canPayout ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center">
          <p className="text-2xl font-bold text-white font-mono tabular-nums mb-1">
            {formatCurrency(pendingBalance)}
          </p>
          <p className="text-slate-400 text-sm">available balance</p>
          <div className="mt-4 w-full h-1.5 rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-blue-500/60 transition-all"
              style={{ width: `${Math.min((pendingBalance / 10) * 100, 100)}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs mt-2">
            {formatCurrency(Math.max(0, 10 - pendingBalance))} more to unlock withdrawal
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => payoutMutation.mutate(d))} className="space-y-5">
          <div>
            <label htmlFor="amount_usd" className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
              <input
                id="amount_usd"
                {...register("amount_usd", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="10"
                max={pendingBalance}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
            {errors.amount_usd && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <span>⚠</span> {errors.amount_usd.message}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Available balance</span>
              <span className="text-white font-mono tabular-nums">{formatCurrency(pendingBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Withdrawal amount</span>
              <span className="text-white font-mono tabular-nums">
                {watchedAmount > 0 ? `−${formatCurrency(watchedAmount)}` : "—"}
              </span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between">
              <span className="text-slate-400">Remaining</span>
              <span className={`font-mono tabular-nums font-semibold ${remainingAfter >= 0 ? "text-white" : "text-red-400"}`}>
                {formatCurrency(Math.max(0, remainingAfter))}
              </span>
            </div>
          </div>

          {payoutMutation.isError && (
            <div className="rounded-xl bg-red-950/30 border border-red-500/20 p-3 text-red-400 text-sm">
              {payoutMutation.error instanceof Error
                ? payoutMutation.error.message
                : "Payout failed. Please try again."}
            </div>
          )}

          {payoutMutation.isSuccess && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-3 text-emerald-400 text-sm flex items-center gap-2">
              <span>✓</span> Payout requested — processing in 1-2 business days.
            </div>
          )}

          <button
            type="submit"
            disabled={payoutMutation.isPending}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            aria-label="Request payout"
          >
            {payoutMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Withdraw ${watchedAmount > 0 ? formatCurrency(watchedAmount) : ""}`
            )}
          </button>

        </form>
      )}
    </div>
  );
}
