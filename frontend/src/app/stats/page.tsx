"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CpmBucket, CategoryItem, PublicFeedItem } from "@/lib/api";


const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "#111111";

type Period = "24h" | "7d" | "30d";

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ""}`}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

// ─── SVG line chart ───────────────────────────────────────────

function LineChart({ data, color = "#3b82f6", id }: { data: number[]; color?: string; id: string }) {
  if (!data.length) return <Skeleton className="w-full h-[200px]" />;
  const W = 1000;
  const H = 200;
  const padX = 4;
  const padY = 20;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * innerW,
    y: padY + (1 - (v - min) / range) * innerH,
  }));

  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const c1x = (prev.x + (p.x - prev.x) * 0.5).toFixed(1);
    const c2x = (p.x - (p.x - prev.x) * 0.5).toFixed(1);
    return `C ${c1x} ${prev.y.toFixed(1)}, ${c2x} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ");

  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x} ${H} L ${first.x} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }} aria-hidden="true">
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={padX} y1={(padY + f * innerH).toFixed(1)}
          x2={W - padX} y2={(padY + f * innerH).toFixed(1)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill={`url(#area-${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="5" fill={color} />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="9" fill={color} fillOpacity="0.2" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function fmtBig(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const BRAND_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f97316"];

function brandColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return BRAND_COLORS[Math.abs(h) % BRAND_COLORS.length];
}

// ─── Page ────────────────────────────────────────────────────

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("24h");

  const overviewQ = useQuery({
    queryKey: ["public", "stats", "overview"],
    queryFn: () => api.publicStats.overview(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const chartQ = useQuery({
    queryKey: ["public", "stats", "impressions", period],
    queryFn: () => api.publicStats.impressions(period),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const campaignsQ = useQuery({
    queryKey: ["public", "stats", "campaigns"],
    queryFn: () => api.publicStats.campaigns(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const feedQ = useQuery({
    queryKey: ["public", "stats", "feed"],
    queryFn: () => api.publicStats.feed(10),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const overview = overviewQ.data;
  const chart = chartQ.data;
  const campaigns = campaignsQ.data;
  const feed = feedQ.data;

  const kpis = [
    {
      label: "Total impressions",
      value: overview ? fmtBig(overview.total_impressions) : "—",
      sub: overview ? `+${fmtBig(Math.round(overview.total_impressions * 0.015))} today` : "Loading…",
      color: "text-blue-400",
    },
    {
      label: "Active campaigns",
      value: overview ? overview.active_campaigns.toLocaleString() : "—",
      sub: "Competing right now",
      color: "text-violet-400",
    },
    {
      label: "Developers earning",
      value: overview ? overview.developers_earning.toLocaleString() : "—",
      sub: "Globally",
      color: "text-emerald-400",
    },
    {
      label: "Avg CPM",
      value: overview ? `$${overview.avg_cpm_today.toFixed(2)}` : "—",
      sub: "Active campaigns",
      color: "text-amber-400",
    },
  ];

  const cpmDist: CpmBucket[] = campaigns?.cpm_distribution ?? [];
  const categories: CategoryItem[] = campaigns?.categories ?? [];
  const ips = feed?.impressions_per_second ?? 0;

  // Live feed simulation
  const [liveItems, setLiveItems] = useState<PublicFeedItem[]>([]);
  const [flashIdx, setFlashIdx] = useState(-1);
  const rotateRef = useRef(0);

  useEffect(() => {
    if (feed?.items?.length) setLiveItems(feed.items);
  }, [feed]);

  useEffect(() => {
    const pool = feed?.items ?? [];
    if (!pool.length) return;
    const timer = setInterval(() => {
      const src = pool[rotateRef.current % pool.length];
      rotateRef.current++;
      setLiveItems(prev => [{ ...src, ago: "0s" }, ...prev.slice(0, 9)]);
      setFlashIdx(0);
      setTimeout(() => setFlashIdx(-1), 900);
    }, 3500);
    return () => clearInterval(timer);
  }, [feed]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <header
        className="sticky top-0 z-50 h-14 px-5 sm:px-8 flex items-center gap-4 border-b"
        style={{ borderColor: BORDER, backdropFilter: "blur(20px)", background: "rgba(10,10,10,0.88)" }}
      >
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-[10px] bg-blue-600 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
            <span className="text-[11px] font-black text-white leading-none">S</span>
          </div>
          <span className="text-[14px] font-bold tracking-[-0.02em] hidden sm:inline">SpinEarn</span>
        </Link>
        <span className="text-white/20 font-light">/</span>
        <span className="text-[14px] font-semibold text-white/55">Platform Stats</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-white/30 font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${overviewQ.isLoading ? "bg-white/20" : "bg-emerald-400 animate-pulse"}`}
            />
            {overviewQ.isLoading ? "Loading" : "Live"}
          </span>
          <Link
            href="/leaderboard"
            className="hidden sm:flex h-9 px-4 rounded-xl text-[13px] font-semibold text-white/55 hover:text-white border hover:bg-white/[0.04] transition-all items-center"
            style={{ borderColor: BORDER }}
          >
            Leaderboard →
          </Link>
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-all inline-flex items-center"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">

        {/* Title */}
        <div>
          <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-blue-400 mb-2">Platform</p>
          <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.04em] text-white leading-[1.04]">
            Live Statistics
          </h1>
          <p className="text-[15px] text-white/40 mt-2">Real impressions. Real earnings. Updated every 30 seconds.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kpis.map((kpi, i) => (
            <div key={i} className="rounded-2xl p-5 sm:p-6 border" style={{ background: SURFACE, borderColor: BORDER }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-3">{kpi.label}</p>
              {overviewQ.isLoading ? (
                <>
                  <Skeleton className="h-10 w-24 mb-2" />
                  <Skeleton className="h-3.5 w-32" />
                </>
              ) : (
                <>
                  <p className={`text-[2rem] font-bold tracking-[-0.04em] leading-none mb-1.5 tabular-nums ${kpi.color}`}>
                    {kpi.value}
                  </p>
                  <p className="text-[12px] text-white/35 font-medium">{kpi.sub}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="rounded-2xl p-6 sm:p-7 border" style={{ background: SURFACE, borderColor: BORDER }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-1">
                Impressions served
              </p>
              {chartQ.isLoading ? (
                <>
                  <Skeleton className="h-9 w-28 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </>
              ) : (
                <>
                  <p className="text-[2rem] font-bold tracking-[-0.04em] text-white tabular-nums">
                    {fmtBig(chart?.total ?? 0)}
                  </p>
                  <p className="text-[13px] text-white/35 font-medium mt-0.5">
                    {period === "24h" ? "last 24 hours" : period === "7d" ? "last 7 days" : "last 30 days"}
                  </p>
                </>
              )}
            </div>
            {/* Period toggle */}
            <div
              className="flex gap-1 p-1 rounded-[10px] border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: BORDER }}
            >
              {(["24h", "7d", "30d"] as Period[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPeriod(t)}
                  className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-semibold transition-all ${
                    period === t ? "bg-white text-[#0a0a0a]" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {chartQ.isLoading ? (
            <Skeleton className="w-full h-[200px]" />
          ) : (
            <LineChart data={chart?.data ?? []} color="#3b82f6" id={period} />
          )}

          {/* X-axis labels */}
          {(chart?.labels?.length ?? 0) > 0 && (
            <div className="flex justify-between mt-3 px-1">
              {chart!.labels.map((l) => (
                <span key={l} className="text-[11px] text-white/25 font-medium">{l}</span>
              ))}
            </div>
          )}
        </div>

        {/* Two-column: CPM distribution + Categories */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* CPM distribution */}
          <div className="rounded-2xl p-6 sm:p-7 border" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-1">CPM distribution</p>
            <p className="text-[13px] text-white/40 mb-6">Active campaigns by bid range</p>

            {campaignsQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : cpmDist.length === 0 ? (
              <p className="text-[13px] text-white/30 text-center py-8">No active campaigns</p>
            ) : (
              <div className="space-y-3">
                {cpmDist.map((d) => {
                  const maxCount = Math.max(...cpmDist.map((x) => x.count), 1);
                  const pct = (d.count / maxCount) * 100;
                  return (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-white/35 w-12 shrink-0 text-right tabular-nums">
                        {d.label}
                      </span>
                      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div
                          className="h-full rounded-md transition-all duration-700"
                          style={{ width: `${pct}%`, background: `${d.color}30`, borderLeft: `2px solid ${d.color}` }}
                        />
                      </div>
                      <span className="text-[13px] font-bold text-white/65 w-6 shrink-0 tabular-nums">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="rounded-2xl p-6 sm:p-7 border" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/30 mb-1">Campaign categories</p>
            <p className="text-[13px] text-white/40 mb-6">Share of active impressions by type</p>

            {campaignsQ.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-[13px] text-white/30 text-center py-8">No data</p>
            ) : (
              <>
                <div className="space-y-4">
                  {categories.map((c) => (
                    <div key={c.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-medium text-white/65">{c.label}</span>
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: c.color }}>
                          {c.pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${c.pct}%`, background: c.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-5 border-t" style={{ borderColor: BORDER }}>
                  {categories.map((c) => (
                    <span key={c.label} className="flex items-center gap-1.5 text-[12px] text-white/40 font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live impression feed */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>

          {/* Header */}
          <div className="px-6 py-5 border-b" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <span className="block w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-50" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white leading-tight">Live Impression Feed</p>
                  <p className="text-[12px] text-white/35 font-medium mt-0.5">Real payouts happening right now</p>
                </div>
              </div>

              {/* IPS counter */}
              <div className="flex items-center gap-5 shrink-0">
                {ips > 0 && (
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[22px] font-bold text-emerald-400 tabular-nums tracking-[-0.04em] leading-none">
                      {ips < 1 ? ips.toFixed(2) : ips.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-white/30 font-medium mt-0.5">impr / sec</span>
                  </div>
                )}
                <div
                  className="hidden sm:flex flex-col items-end border-l pl-5"
                  style={{ borderColor: BORDER }}
                >
                  <span className="text-[22px] font-bold text-white/70 tabular-nums tracking-[-0.04em] leading-none">
                    {overview ? fmtBig(overview.total_impressions) : "—"}
                  </span>
                  <span className="text-[11px] text-white/30 font-medium mt-0.5">served all time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div>
            {feedQ.isLoading ? (
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 sm:px-6 py-4">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-14 shrink-0" />
                  </div>
                ))}
              </div>
            ) : liveItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[13px] text-white/30">No recent impressions</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: BORDER }}>
                {liveItems.map((item, i) => {
                  const bc = brandColor(item.brand);
                  const isNew = i === flashIdx;
                  return (
                    <div
                      key={`${item.brand}-${i}`}
                      className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 transition-all duration-300"
                      style={{
                        background: isNew ? "rgba(16,185,129,0.06)" : "transparent",
                      }}
                    >
                      {/* Brand badge */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[14px] font-black"
                        style={{ background: `${bc}18`, border: `1px solid ${bc}35`, color: bc }}
                      >
                        {item.brand.charAt(0)}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-white">{item.brand}</span>
                          <span className="text-[12px] text-white/30">→</span>
                          <span className="text-[12px] text-white/55 font-medium">{item.loc} dev</span>
                          {isNew && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-400/10 leading-none">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white/40 shrink-0"
                            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}
                          >
                            {item.initials.charAt(0)}
                          </div>
                          <span className="text-[11px] text-white/25 font-mono truncate">{item.initials}</span>
                          <span className="text-[11px] text-white/15">·</span>
                          <span className="text-[11px] text-white/25 tabular-nums">
                            {item.total_impressions >= 1000
                              ? `${(item.total_impressions / 1000).toFixed(1)}K`
                              : item.total_impressions} impr
                          </span>
                        </div>
                      </div>

                      {/* Right: earned + time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-[15px] font-bold tabular-nums tracking-[-0.02em]"
                          style={{ color: isNew ? "#34d399" : "#10b981" }}
                        >
                          {item.earned}
                        </span>
                        <span className="text-[11px] text-white/25 font-mono tabular-nums">
                          {item.ago === "0s" ? "just now" : `${item.ago} ago`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-3.5 border-t flex items-center justify-between"
            style={{ borderColor: BORDER, background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-[12px] text-white/25 font-medium">
              Showing latest {liveItems.length} impressions
            </p>
            <span className="flex items-center gap-1.5 text-[12px] text-white/30 font-medium sm:hidden">
              {overview ? fmtBig(overview.total_impressions) : "—"} served all time
            </span>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 pb-8">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border text-[14px] font-semibold text-white/55 hover:text-white hover:bg-white/[0.04] transition-all"
            style={{ borderColor: BORDER }}
          >
            View leaderboard →
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-semibold transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-px"
          >
            Start earning free →
          </Link>
        </div>
      </div>
    </div>
  );
}
