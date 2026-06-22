"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

type Tab = "bank" | "upi";

export default function RazorpayPayoutSetup({ onComplete }: { onComplete?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("upi");
  const [error, setError] = useState<string | null>(null);

  // Bank form
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holderName, setHolderName] = useState("");

  // UPI form
  const [vpa, setVpa] = useState("");

  const bankMutation = useMutation({
    mutationFn: () =>
      api.razorpay.onboardBank({ account_number: accountNumber, ifsc, account_holder_name: holderName }, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-provider"] });
      onComplete?.();
    },
    onError: (e: Error) => setError(e.message),
  });

  const upiMutation = useMutation({
    mutationFn: () => api.razorpay.onboardUpi(vpa, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-provider"] });
      onComplete?.();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (accountNumber !== confirmAccount) { setError("Account numbers do not match"); return; }
    if (ifsc.length !== 11) { setError("IFSC must be 11 characters"); return; }
    bankMutation.mutate();
  };

  const handleUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vpa.includes("@")) { setError("Enter a valid UPI address (e.g. name@upi)"); return; }
    upiMutation.mutate();
  };

  const isPending = bankMutation.isPending || upiMutation.isPending;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div>
        <h3 className="text-white font-semibold">Set Up Indian Payout (Razorpay)</h3>
        <p className="text-slate-500 text-sm mt-1">Earnings sent directly to your bank or UPI</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
        {(["upi", "bank"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "upi" ? "UPI (Instant)" : "Bank Account"}
          </button>
        ))}
      </div>

      {/* UPI Form */}
      {tab === "upi" && (
        <form onSubmit={handleUpiSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              UPI Address
            </label>
            <input
              type="text"
              value={vpa}
              onChange={(e) => setVpa(e.target.value.trim().toLowerCase())}
              placeholder="yourname@upi"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
            />
            <p className="text-slate-600 text-xs mt-1">e.g. 9307880940@paytm · name@gpay · user@okicici</p>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all"
          >
            {isPending ? "Saving…" : "Save UPI Address"}
          </button>
        </form>
      )}

      {/* Bank Form */}
      {tab === "bank" && (
        <form onSubmit={handleBankSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Account Holder Name
            </label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="As on bank passbook"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Account Number
            </label>
            <input
              type="password"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter account number"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Confirm Account Number
            </label>
            <input
              type="text"
              value={confirmAccount}
              onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter account number"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              IFSC Code
            </label>
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-slate-600 text-xs mt-1">11-character code on cheque / passbook</p>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all"
          >
            {isPending ? "Saving…" : "Save Bank Account"}
          </button>
        </form>
      )}

      <p className="text-slate-700 text-xs text-center">
        Secured by Razorpay · Bank-grade encryption
      </p>
    </div>
  );
}
