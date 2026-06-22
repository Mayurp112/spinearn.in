"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatsChart } from "@/components/advertiser/StatsChart";
import { api } from "@/lib/api";

import { campaignStatusColor, formatCurrency, formatDate, formatPercent, formatRoas } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export default function CampaignDetailClient({ id }: { id: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const campaignQuery = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => api.campaigns.get(id, token!),
    enabled: !!token,
  });

  const statsQuery = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => api.campaigns.stats(id, token!),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.campaigns.update(id, { status }, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.campaigns.delete(id, token!),
    onSuccess: () => { window.location.href = "/advertise"; },
  });

  const campaign = campaignQuery.data;
  const stats = statsQuery.data;

  if (campaignQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 rounded-2xl bg-slate-800/60 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-800/60 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  if (!campaign) return (
    <div className="text-center py-20">
      <p className="text-slate-400">Campaign not found.</p>
    </div>
  );

  const deliveryPct = stats?.completion_pct ?? 0;
  const dailyAvg = stats?.daily_breakdown.length
    ? stats.daily_breakdown.reduce((s, d) => s + d.impressions, 0) / stats.daily_breakdown.length
    : 0;
  const totalBudget = parseFloat(campaign?.bid_cpm ?? "0") * (campaign?.impressions_purchased ?? 0) / 1000;
  const spentAmount = parseFloat(campaign?.total_spend ?? "0");
  const budgetRemaining = Math.max(totalBudget - spentAmount, 0);
  const conversions = stats?.conversions_count ?? campaign?.conversions_count ?? 0;
  const convRate = stats?.conversion_rate ?? (campaign?.clicks_count && conversions > 0 ? conversions / campaign.clicks_count : 0);
  const cpa = stats?.cpa ?? (conversions > 0 ? spentAmount / conversions : null);
  const roas = stats?.roas ?? null;

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${campaignStatusColor(campaign.status)}`}>
              {campaign.status.replace("_", " ")}
            </span>
            {campaign.status === "active" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Serving impressions
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 leading-snug">{campaign.creative_text}</h1>
          <p className="text-slate-500 text-sm break-all sm:break-normal">
            <span className="hidden sm:inline">{campaign.destination_url} · </span>Created {formatDate(campaign.created_at)} · ${campaign.bid_cpm} CPM
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === "active" && (
            <button
              onClick={() => updateMutation.mutate("paused")}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-semibold transition-all disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => updateMutation.mutate("active")}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition-all disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {["active", "paused"].includes(campaign.status) && (
            <button
              onClick={() => {
                if (confirm("Cancel this campaign? This cannot be undone.")) cancelMutation.mutate();
              }}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 rounded-xl border border-red-800 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Delivery + engagement KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard label="Impressions" value={`${campaign.impressions_served.toLocaleString()} / ${campaign.impressions_purchased.toLocaleString()}`} />
        <KpiCard label="Delivery" value={stats ? `${deliveryPct.toFixed(1)}%` : "—"} accent={deliveryPct >= 100 ? "emerald" : deliveryPct > 70 ? "amber" : undefined} />
        <KpiCard label="Clicks" value={campaign.clicks_count.toLocaleString()} />
        <KpiCard label="CTR" value={stats ? formatPercent(stats.ctr) : "—"} />
        <KpiCard label="Total Spend" value={formatCurrency(campaign.total_spend)} accent="blue" />
        <KpiCard label="Auction Position" value={stats ? `#${stats.auction_position + 1}` : "—"} accent={stats?.auction_position === 0 ? "yellow" : undefined} />
      </div>

      {/* Performance metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Conversions" value={conversions.toLocaleString()} />
        <KpiCard
          label="Conv. Rate"
          value={convRate > 0 ? formatPercent(convRate) : "—"}
          hint={convRate === 0 ? "Set up conversion tracking" : undefined}
        />
        <KpiCard
          label="ROAS"
          value={roas !== null ? formatRoas(roas) : "—"}
          hint={roas === null ? "Requires conversion tracking" : undefined}
          accent={roas !== null && roas >= 2 ? "emerald" : undefined}
        />
        <KpiCard
          label="CPA"
          value={cpa !== null ? formatCurrency(cpa) : "—"}
          hint={cpa === null ? "No conversions yet" : undefined}
          accent="blue"
        />
      </div>

      {/* Budget management */}
      {totalBudget > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Budget</p>
              <h3 className="text-base font-semibold text-white">Spend Management</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Spent</p>
                <p className="text-white font-mono font-semibold tabular-nums text-sm">{formatCurrency(spentAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Remaining</p>
                <p className="text-emerald-400 font-mono font-semibold tabular-nums text-sm">{formatCurrency(budgetRemaining)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Total</p>
                <p className="text-slate-300 font-mono font-semibold tabular-nums text-sm">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${
                spentAmount / totalBudget >= 0.9 ? "bg-red-500" : spentAmount / totalBudget > 0.7 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min((spentAmount / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1.5">
            <span>{((spentAmount / totalBudget) * 100).toFixed(1)}% of budget used</span>
            <span>{dailyAvg > 0 ? `~${Math.ceil(budgetRemaining / (spentAmount / Math.max(stats?.daily_breakdown.length ?? 1, 1)))} days remaining` : "campaign queued"}</span>
          </div>
        </div>
      )}

      {/* Delivery bar */}
      {stats && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Campaign Delivery</p>
              <p className="text-white font-semibold">
                {campaign.impressions_served.toLocaleString()} of {campaign.impressions_purchased.toLocaleString()} impressions
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold font-mono tabular-nums ${deliveryPct >= 100 ? "text-emerald-400" : deliveryPct > 70 ? "text-amber-400" : "text-white"}`}>
                {deliveryPct.toFixed(1)}%
              </p>
              {dailyAvg > 0 && (
                <p className="text-slate-500 text-xs">avg {Math.round(dailyAvg).toLocaleString()} impr/day</p>
              )}
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${deliveryPct >= 100 ? "bg-emerald-500" : deliveryPct > 70 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(deliveryPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="space-y-4">
          <StatsChart dailyBreakdown={stats.daily_breakdown} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stats.hourly_breakdown.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Activity</p>
                    <h3 className="text-base font-semibold text-white">Last 24 Hours</h3>
                  </div>
                  <p className="text-slate-400 text-sm font-mono tabular-nums">
                    {stats.hourly_breakdown.reduce((s, h) => s + h.impressions, 0).toLocaleString()} impr
                  </p>
                </div>
                <div className="flex items-end gap-0.5 h-20">
                  {stats.hourly_breakdown.map((h, idx) => {
                    const max = Math.max(...stats.hourly_breakdown.map((x) => x.impressions), 1);
                    const pct = Math.max((h.impressions / max) * 100, 3);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-blue-500/40 hover:bg-blue-400 rounded-t-sm transition-colors cursor-default"
                          style={{ height: `${pct}%` }}
                        />
                        <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                          <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap">
                            {h.hour.slice(11, 13)}:00 · {h.impressions}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-slate-700 text-xs">
                  <span>24h ago</span>
                  <span>now</span>
                </div>
              </div>
            )}

            {stats.daily_spend.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Spend</p>
                    <h3 className="text-base font-semibold text-white">Daily Trend</h3>
                  </div>
                  <p className="text-slate-400 text-sm font-mono tabular-nums">
                    {formatCurrency(stats.daily_spend.reduce((s, d) => s + d.spend, 0))} total
                  </p>
                </div>
                <div className="space-y-2.5">
                  {stats.daily_spend.slice(-7).map((d) => {
                    const maxSpend = Math.max(...stats.daily_spend.map((x) => x.spend), 0.001);
                    const pct = (d.spend / maxSpend) * 100;
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs w-12 shrink-0 tabular-nums">{d.date.slice(5)}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-white text-xs w-16 text-right font-mono tabular-nums shrink-0">
                          {formatCurrency(d.spend)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Geography</p>
                <h3 className="text-base font-semibold text-white">Impressions by Country</h3>
              </div>
              {stats.geo_breakdown && stats.geo_breakdown.length > 0 ? (
                <div className="space-y-3">
                  {stats.geo_breakdown.map((g) => (
                    <div key={g.country_code} className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs w-28 shrink-0 truncate">{g.country}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${g.pct}%` }} />
                      </div>
                      <span className="text-white text-xs w-20 text-right font-mono tabular-nums shrink-0">
                        {g.impressions.toLocaleString()} <span className="text-slate-600">({g.pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <span className="text-2xl" aria-hidden="true">🌍</span>
                  <p className="text-slate-500 text-sm">Geographic data unavailable</p>
                  <p className="text-slate-600 text-xs">Available once the campaign has served 100+ impressions</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Reach</p>
                <h3 className="text-base font-semibold text-white">Top Developers</h3>
              </div>
              {stats.top_developers && stats.top_developers.length > 0 ? (
                <div className="space-y-2">
                  {stats.top_developers.map((dev, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40">
                      <span className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-xs text-slate-400 font-mono shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-white text-sm flex-1 truncate font-medium">{dev.display_name}</span>
                      <span className="text-slate-500 text-xs tabular-nums shrink-0">{dev.impressions.toLocaleString()} impr</span>
                      <span className="text-blue-400 text-xs tabular-nums shrink-0 w-12 text-right font-mono">
                        {dev.pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <span className="text-2xl" aria-hidden="true">👨‍💻</span>
                  <p className="text-slate-500 text-sm">Developer reach data unavailable</p>
                  <p className="text-slate-600 text-xs">Shows which developers are serving your ads most</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Campaign Intelligence</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <RecommendationCard
                icon="🎯"
                accent="blue"
                title={stats.auction_position === 0 ? "Top position secured" : "Bid opportunity"}
                body={stats.auction_position === 0
                  ? "Your campaign is winning the live auction and capturing all eligible impressions."
                  : `You're at position #${stats.auction_position + 1}. Increase your CPM to reach more developers.`}
              />
              <RecommendationCard
                icon="📊"
                accent="violet"
                title={conversions > 0 ? "Conversion performance" : "Engagement signal"}
                body={conversions > 0
                  ? `${conversions} conversions at ${cpa !== null ? formatCurrency(cpa) : "—"} CPA — ${stats.ctr > 0.01 ? "strong" : "moderate"} funnel performance.`
                  : stats.ctr > 0.01
                  ? `${formatPercent(stats.ctr)} CTR — strong developer interest in your product.`
                  : stats.ctr > 0
                  ? `${formatPercent(stats.ctr)} CTR — consider refining your ad copy for higher engagement.`
                  : "No clicks yet. Ensure your copy includes a clear call-to-action."}
              />
              <RecommendationCard
                icon="⏱"
                accent="emerald"
                title="Pacing"
                body={deliveryPct >= 100
                  ? "Campaign fully delivered. Consider launching a follow-up campaign."
                  : dailyAvg > 0
                  ? `At current pace, completes in ~${Math.ceil((campaign.impressions_purchased - campaign.impressions_served) / dailyAvg)} days.`
                  : "Campaign is queued and will start serving once the auction is won."}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ label, value, accent, hint }: { label: string; value: string; accent?: "blue" | "emerald" | "amber" | "yellow"; hint?: string }) {
  const colors = { blue: "text-blue-300", emerald: "text-emerald-400", amber: "text-amber-400", yellow: "text-yellow-400" };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-slate-500 text-xs mb-2 truncate">{label}</p>
      <p className={`text-xl font-bold font-mono tabular-nums ${accent ? colors[accent] : "text-white"}`}>{value}</p>
      {hint && <p className="text-slate-600 text-xs mt-1 truncate">{hint}</p>}
    </div>
  );
}

function RecommendationCard({ icon, accent, title, body }: { icon: string; accent: "blue" | "violet" | "emerald"; title: string; body: string }) {
  const bg = { blue: "bg-blue-500/10 border-blue-500/20", violet: "bg-violet-500/10 border-violet-500/20", emerald: "bg-emerald-500/10 border-emerald-500/20" };
  const tc = { blue: "text-blue-400", violet: "text-violet-400", emerald: "text-emerald-400" };
  return (
    <div className={`rounded-xl border p-4 flex gap-3 ${bg[accent]}`}>
      <span className="text-base leading-none shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
      <div>
        <p className={`text-xs font-semibold mb-1 ${tc[accent]}`}>{title}</p>
        <p className="text-slate-400 text-xs leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
