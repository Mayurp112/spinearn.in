"use client";

import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { campaignStatusColor, formatCurrency, formatPercent } from "@/lib/utils";

interface Props {
  campaign: Campaign;
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  exhausted: "bg-slate-500",
  cancelled: "bg-red-400",
  pending_payment: "bg-blue-400",
};

export function CampaignCard({ campaign }: Props) {
  const progress =
    campaign.impressions_purchased > 0
      ? Math.min((campaign.impressions_served / campaign.impressions_purchased) * 100, 100)
      : 0;

  const ctr =
    campaign.impressions_served > 0
      ? campaign.clicks_count / campaign.impressions_served
      : 0;

  const dotColor = STATUS_DOT[campaign.status] ?? "bg-slate-500";

  return (
    <Link
      href={`/advertise/${campaign.id}`}
      className="group block rounded-2xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/80 transition-all p-6"
      aria-label={`View campaign: ${campaign.creative_text} — ${campaign.status.replace("_", " ")}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dotColor} ${campaign.status === "active" ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-semibold text-white leading-snug truncate">{campaign.creative_text}</p>
            <p className="text-slate-600 text-xs truncate mt-0.5">{campaign.destination_url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${campaignStatusColor(campaign.status)}`}>
            {campaign.status.replace("_", " ")}
          </span>
          <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform text-sm" aria-hidden="true">→</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-5">
        <Metric label="Impressions" value={campaign.impressions_served.toLocaleString()} />
        <Metric label="Clicks" value={campaign.clicks_count.toLocaleString()} />
        <Metric label="Conversions" value={(campaign.conversions_count ?? 0).toLocaleString()} />
        <Metric label="CTR" value={formatPercent(ctr)} />
        <Metric label="Spend" value={formatCurrency(campaign.total_spend)} accent />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Campaign delivery</span>
          <span className="tabular-nums">
            {campaign.impressions_served.toLocaleString()} / {campaign.impressions_purchased.toLocaleString()} impr
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${
              progress >= 100 ? "bg-emerald-500" : progress > 70 ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-600">${campaign.bid_cpm} CPM</span>
          <span className={`tabular-nums font-medium ${
            progress >= 100 ? "text-emerald-400" : progress > 70 ? "text-amber-400" : "text-slate-500"
          }`}>
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-slate-600 text-xs mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${accent ? "text-blue-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
