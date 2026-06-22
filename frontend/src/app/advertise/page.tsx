"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CampaignCard } from "@/components/advertiser/CampaignCard";
import { api } from "@/lib/api";

import { formatCurrency, formatPercent } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

const MEDAL_BG = ["bg-yellow-500/20 border-yellow-500/30 text-yellow-400", "bg-slate-600/20 border-slate-600/30 text-slate-400", "bg-amber-700/20 border-amber-700/30 text-amber-600"];

export default function AdvertisePage() {
  const token = useAuthStore((s) => s.accessToken);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.campaigns.list(token!),
    enabled: !!token,
  });

  const auctionQuery = useQuery({
    queryKey: ["auction"],
    queryFn: () => api.campaigns.auction(token!),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  if (!token) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <span className="text-2xl font-black text-white" aria-hidden="true">S</span>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Sign in to manage campaigns</h2>
        <p className="text-slate-400 text-sm">Create and manage your SpinEarn advertising campaigns</p>
      </div>
      <a href="/login" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 text-white">
        Sign in →
      </a>
    </div>
  );

  const campaigns = campaignsQuery.data ?? [];
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalSpend = campaigns.reduce((s, c) => s + parseFloat(c.total_spend), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions_served, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks_count, 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions_count ?? 0), 0);
  const portfolioCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const totalBudget = campaigns.reduce((s, c) => s + parseFloat(c.bid_cpm) * c.impressions_purchased / 1000, 0);
  const budgetRemaining = Math.max(totalBudget - totalSpend, 0);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-slate-400 text-sm mt-0.5 font-medium">Manage your SpinEarn advertising portfolio</p>
        </div>
        <Link
          href="/advertise/new"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          + New Campaign
        </Link>
      </div>

      {/* Portfolio KPIs */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-4 col-span-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">Active</p>
              <p className="text-2xl font-bold text-white font-mono">{activeCampaigns.length}</p>
              <p className="text-slate-500 text-xs mt-1">of {campaigns.length} total</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Impressions</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{totalImpressions.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">developer eyeballs</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Clicks</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{totalClicks.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">
                {portfolioCtr > 0 ? `${formatPercent(portfolioCtr)} CTR` : "across all campaigns"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Conversions</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{totalConversions.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">
                {totalConversions > 0 ? `${formatPercent(totalConversions / totalClicks)} conv. rate` : "tracking setup needed"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Total Spend</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{formatCurrency(totalSpend)}</p>
              <p className="text-slate-500 text-xs mt-1">across all campaigns</p>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">Budget Left</p>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">{formatCurrency(budgetRemaining)}</p>
              <p className="text-slate-500 text-xs mt-1">of {formatCurrency(totalBudget)} allocated</p>
            </div>
          </div>

          {/* Budget bar */}
          {totalBudget > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 flex items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 shrink-0">Portfolio Spend</p>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((totalSpend / totalBudget) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 tabular-nums shrink-0 font-mono">
                {((totalSpend / totalBudget) * 100).toFixed(1)}% used
              </p>
            </div>
          )}
        </div>
      )}

      {/* Live auction board */}
      {auctionQuery.data && auctionQuery.data.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live Auction</p>
              </div>
              <p className="text-base font-semibold text-white">Active bidders — top 5</p>
            </div>
            <p className="text-slate-600 text-xs">Refreshes every 15s</p>
          </div>
          <div className="space-y-2 overflow-x-auto">
            {auctionQuery.data.slice(0, 5).map((bid, i) => (
              <div
                key={bid.campaign_id}
                className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl min-w-0 ${
                  i === 0 ? "bg-slate-800/80 border border-slate-700" : "bg-slate-800/20"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${MEDAL_BG[i] ?? "bg-slate-700/20 border-slate-700 text-slate-500"}`}>
                  {i + 1}
                </span>
                <span className="text-white text-sm flex-1 truncate min-w-0 font-medium">{bid.creative_text}</span>
                <span className="text-slate-500 text-xs shrink-0 tabular-nums hidden sm:inline">
                  {bid.impressions_remaining.toLocaleString()} left
                </span>
                <span className="text-emerald-400 text-sm font-mono font-semibold tabular-nums shrink-0">
                  ${bid.bid_cpm.toFixed(2)} CPM
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaignsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">Your Campaigns</p>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-800 bg-slate-900/50 gap-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl" aria-hidden="true">🎯</div>
          <div className="text-center">
            <p className="text-white font-semibold mb-1">No campaigns yet</p>
            <p className="text-slate-300 text-sm font-medium">Create your first campaign to start reaching developers</p>
          </div>
          <Link
            href="/advertise/new"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all font-semibold text-sm shadow-lg shadow-blue-500/20"
          >
            Create your first campaign →
          </Link>
        </div>
      )}

    </div>
  );
}
