"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

type PaymentType = "iban" | "swift_code" | "aba" | "sort_code";

const CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "PLN", label: "Polish Zloty" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "ZAR", label: "South African Rand" },
  { code: "AED", label: "UAE Dirham" },
  { code: "MYR", label: "Malaysian Ringgit" },
  { code: "PHP", label: "Philippine Peso" },
];

const TABS: { key: PaymentType; label: string; hint: string }[] = [
  { key: "iban",       label: "IBAN",         hint: "Europe, Middle East, most of world" },
  { key: "swift_code", label: "SWIFT / BIC",  hint: "Any country with SWIFT code" },
  { key: "aba",        label: "US ACH",        hint: "United States only" },
  { key: "sort_code",  label: "UK Sort Code",  hint: "United Kingdom only" },
];

const inputCls = "w-full px-4 py-3 rounded-xl bg-[#111111] border border-white/10 text-white placeholder-white/20 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors";
const labelCls = "block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5";

export default function WisePayoutSetup({ onComplete }: { onComplete?: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [tab, setTab] = useState<PaymentType>("iban");
  const [error, setError] = useState<string | null>(null);

  // Shared
  const [holderName, setHolderName] = useState("");
  const [currency, setCurrency] = useState("USD");

  // IBAN
  const [iban, setIban] = useState("");

  // SWIFT
  const [swiftAccount, setSwiftAccount] = useState("");
  const [swiftCode, setSwiftCode] = useState("");

  // US ACH
  const [achAccount, setAchAccount] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");

  // UK Sort Code
  const [ukAccount, setUkAccount] = useState("");
  const [sortCode, setSortCode] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.wise.onboard>[0]) =>
      api.wise.onboard(payload, token!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-provider"] });
      onComplete?.();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!holderName.trim()) { setError("Account holder name is required"); return; }

    const base = { account_holder_name: holderName.trim(), currency, payment_type: tab };

    switch (tab) {
      case "iban":
        if (!iban.trim()) { setError("IBAN is required"); return; }
        mutation.mutate({ ...base, iban: iban.toUpperCase().replace(/\s/g, "") });
        break;
      case "swift_code":
        if (!swiftAccount.trim() || !swiftCode.trim()) { setError("Account number and SWIFT/BIC code are required"); return; }
        mutation.mutate({ ...base, account_number: swiftAccount.trim(), swift_code: swiftCode.toUpperCase().trim() });
        break;
      case "aba":
        if (!achAccount.trim() || !routingNumber.trim()) { setError("Account number and routing number are required"); return; }
        if (!/^\d{9}$/.test(routingNumber)) { setError("US routing number must be exactly 9 digits"); return; }
        mutation.mutate({ ...base, account_number: achAccount.trim(), routing_number: routingNumber.trim() });
        break;
      case "sort_code":
        if (!ukAccount.trim() || !sortCode.trim()) { setError("Account number and sort code are required"); return; }
        mutation.mutate({ ...base, account_number: ukAccount.replace(/\s/g, ""), routing_number: sortCode.replace(/-/g, "") });
        break;
    }
  };

  return (
    <div className="rounded-2xl border border-white/7 bg-[#111111] p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🌍</span>
          <h3 className="text-white font-semibold tracking-tight">International Payout (Wise)</h3>
        </div>
        <p className="text-white/40 text-sm">Receive earnings in your local currency via Wise</p>
      </div>

      {/* Payment type tabs */}
      <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setError(null); }}
            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? "bg-[#1a1a1a] text-white shadow"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-white/30 text-xs -mt-2 px-1">
        {TABS.find((t) => t.key === tab)?.hint}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shared: holder name + currency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Account Holder Name</label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="As shown on your bank account"
              required
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Payout Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputCls + " appearance-none"}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* IBAN */}
        {tab === "iban" && (
          <div>
            <label className={labelCls}>IBAN</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="DE89 3704 0044 0532 0130 00"
              required
              className={inputCls}
            />
            <p className="text-white/20 text-xs mt-1">Remove spaces before submitting — or leave them, we handle it</p>
          </div>
        )}

        {/* SWIFT */}
        {tab === "swift_code" && (
          <>
            <div>
              <label className={labelCls}>Account Number</label>
              <input
                type="text"
                value={swiftAccount}
                onChange={(e) => setSwiftAccount(e.target.value.trim())}
                placeholder="Your local account number"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>SWIFT / BIC Code</label>
              <input
                type="text"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. DEUTDEDB or CHASUS33"
                maxLength={11}
                required
                className={inputCls}
              />
              <p className="text-white/20 text-xs mt-1">8 or 11 character code — found on bank statement or online banking</p>
            </div>
          </>
        )}

        {/* US ACH */}
        {tab === "aba" && (
          <>
            <div>
              <label className={labelCls}>Account Number</label>
              <input
                type="text"
                value={achAccount}
                onChange={(e) => setAchAccount(e.target.value.replace(/\D/g, ""))}
                placeholder="Checking or savings account number"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ABA Routing Number</label>
              <input
                type="text"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="9-digit routing number"
                maxLength={9}
                required
                className={inputCls}
              />
              <p className="text-white/20 text-xs mt-1">Found on the bottom-left of a check</p>
            </div>
          </>
        )}

        {/* UK Sort Code */}
        {tab === "sort_code" && (
          <>
            <div>
              <label className={labelCls}>Account Number</label>
              <input
                type="text"
                value={ukAccount}
                onChange={(e) => setUkAccount(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="8-digit account number"
                maxLength={8}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Sort Code</label>
              <input
                type="text"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value.replace(/[^\d-]/g, "").slice(0, 8))}
                placeholder="12-34-56"
                maxLength={8}
                required
                className={inputCls}
              />
            </div>
          </>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all"
        >
          {mutation.isPending ? "Connecting to Wise…" : "Save Bank Account"}
        </button>
      </form>

      <p className="text-white/20 text-xs text-center">
        Powered by Wise Business · Bank-grade security · Transfers in 1–2 business days
      </p>
    </div>
  );
}
