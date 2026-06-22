"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LeaderEntry } from "@/lib/api";


const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "#111111";

type Period = "month" | "alltime";

const RANK_STYLES = {
  1: {
    ring: "ring-2 ring-amber-400/60",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.25)]",
    label: "🥇",
    text: "text-amber-400",
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.18)",
  },
  2: {
    ring: "ring-2 ring-white/25",
    glow: "shadow-[0_0_18px_rgba(255,255,255,0.08)]",
    label: "🥈",
    text: "text-white/65",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
  },
  3: {
    ring: "ring-2 ring-amber-600/40",
    glow: "shadow-[0_0_18px_rgba(180,83,9,0.2)]",
    label: "🥉",
    text: "text-amber-600",
    bg: "rgba(180,83,9,0.04)",
    border: "rgba(180,83,9,0.14)",
  },
} as const;

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ""}`}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

function PodiumCard({ entry, flex }: { entry: LeaderEntry; flex: string }) {
  const rank = Math.min(entry.rank, 3) as 1 | 2 | 3;
  const s = RANK_STYLES[rank];
  const minH = rank === 1 ? 240 : rank === 2 ? 200 : 190;

  return (
    <div
      className={`relative flex flex-col items-center justify-end rounded-2xl border p-5 pt-8 ${s.glow} ${flex}`}
      style={{ background: s.bg, borderColor: s.border, minHeight: minH }}
    >
      <span className="absolute top-3 left-3 text-2xl">{s.label}</span>
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-bold mb-3 border ring-offset-[#0a0a0a] ${s.ring} ${s.glow}`}
        style={{ background: SURFACE, borderColor: BORDER }}
      >
        {entry.initials}
      </div>
      <p className="text-[14px] font-bold text-white text-center leading-tight mb-0.5 max-w-[110px] truncate">
        {entry.name}
      </p>
      <p className="text-[12px] text-white/35 mb-3">{entry.loc}</p>
      <p className={`text-[20px] font-bold tracking-[-0.04em] tabular-nums ${s.text}`}>
        ${entry.earned.toFixed(2)}
      </p>
      {entry.badge && (
        <span
          className="mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
          style={{ background: s.border, color: "inherit" }}
        >
          {entry.badge}
        </span>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["public", "leaderboard", period],
    queryFn: () => api.publicStats.leaderboard(period, 50),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const entries: LeaderEntry[] = data?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const totalDevs = data?.total_developers ?? 0;

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
        <span className="text-[14px] font-semibold text-white/55">Leaderboard</span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/stats"
            className="hidden sm:flex h-9 px-4 rounded-xl text-[13px] font-semibold text-white/55 hover:text-white border hover:bg-white/[0.04] transition-all items-center"
            style={{ borderColor: BORDER }}
          >
            Platform Stats →
          </Link>
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-all inline-flex items-center"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-10">

        {/* Title + period toggle */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-amber-400 mb-2">
              Top earners
            </p>
            <h1 className="text-[2rem] sm:text-[2.5rem] font-bold tracking-[-0.04em] text-white leading-[1.04]">
              Developer Leaderboard
            </h1>
            <p className="text-[15px] text-white/40 mt-2">
              {isLoading
                ? "Loading rankings…"
                : `${totalDevs.toLocaleString()} developers earning worldwide`}
            </p>
          </div>

          <div
            className="flex gap-1 p-1 rounded-[10px] border self-start"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: BORDER }}
          >
            {(["month", "alltime"] as Period[]).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-4 py-1.5 rounded-[7px] text-[13px] font-semibold transition-all ${
                  period === t ? "bg-white text-[#0a0a0a]" : "text-white/40 hover:text-white/70"
                }`}
              >
                {t === "month" ? "This month" : "All time"}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        {isLoading ? (
          <div className="flex items-end justify-center gap-4 max-w-lg mx-auto">
            <Skeleton className="flex-1 h-[200px]" />
            <Skeleton className="flex-[1.15] h-[240px]" />
            <Skeleton className="flex-1 h-[190px]" />
          </div>
        ) : top3.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-white/30">No earners yet this period.</p>
            <p className="text-[13px] text-white/20 mt-1">Be the first — install SpinEarn and start earning.</p>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-4 max-w-lg mx-auto">
            {top3[1] && <PodiumCard entry={top3[1]} flex="flex-1" />}
            {top3[0] && <PodiumCard entry={top3[0]} flex="flex-[1.15]" />}
            {top3[2] && <PodiumCard entry={top3[2]} flex="flex-1" />}
          </div>
        )}

        {/* Ranks 4+ table */}
        {(isLoading || rest.length > 0) && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
            <div
              className="hidden sm:grid grid-cols-[44px_1fr_140px_80px_100px] items-center px-6 py-3 border-b"
              style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25">#</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25">Developer</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 text-right">Impressions</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 text-right">Refs</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 text-right">Earned</span>
            </div>

            <div className="divide-y" style={{ borderColor: BORDER }}>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <Skeleton className="h-3 w-6" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-3 flex-1" />
                      <Skeleton className="h-3 w-16 hidden sm:block" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))
                : rest.map((entry) => (
                    <div
                      key={entry.rank}
                      className="grid grid-cols-[44px_1fr_auto] sm:grid-cols-[44px_1fr_140px_80px_100px] items-center gap-3 px-6 py-3.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-[14px] font-bold tabular-nums text-white/25 text-center">
                        {entry.rank}
                      </span>

                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white/60 border shrink-0"
                          style={{ background: "rgba(255,255,255,0.05)", borderColor: BORDER }}
                        >
                          {entry.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-white truncate">{entry.name}</span>
                            {entry.badge && (
                              <span
                                className="hidden sm:inline px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.06em] text-amber-400 shrink-0"
                                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
                              >
                                {entry.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[12px] text-white/30 font-medium">{entry.loc}</span>
                        </div>
                      </div>

                      <span className="hidden sm:block text-[13px] font-semibold text-white/45 text-right tabular-nums">
                        {entry.impressions >= 1000
                          ? `${(entry.impressions / 1000).toFixed(1)}K`
                          : entry.impressions}
                      </span>

                      <span className="hidden sm:block text-[13px] font-semibold text-white/45 text-right tabular-nums">
                        {entry.referrals}
                      </span>

                      <span className="text-[14px] font-bold text-emerald-400 text-right tabular-nums">
                        ${entry.earned.toFixed(2)}
                      </span>
                    </div>
                  ))}
            </div>

            {!isLoading && entries.length > 0 && (
              <div className="px-6 py-3.5 border-t text-center" style={{ borderColor: BORDER }}>
                <p className="text-[12px] text-white/25 font-medium">
                  Showing top {entries.length} of {totalDevs.toLocaleString()} earners ·{" "}
                  <span className="text-white/40">Updated every minute</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-2xl border p-8 sm:p-10 text-center"
          style={{ background: "rgba(37,99,235,0.05)", borderColor: "rgba(37,99,235,0.15)" }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-blue-400 mb-2">Join the rankings</p>
          <h2 className="text-[1.75rem] font-bold tracking-[-0.03em] text-white mb-3">
            Your name could be on this list
          </h2>
          <p className="text-[15px] text-white/40 mb-7 max-w-lg mx-auto">
            Install SpinEarn, keep VS Code open, and earn money every time an ad fires in your terminal. Free, forever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-semibold transition-all shadow-lg shadow-blue-500/25 hover:-translate-y-px"
            >
              Start earning free →
            </Link>
            <Link
              href="/stats"
              className="px-7 py-3.5 rounded-xl border text-[15px] font-semibold text-white/55 hover:text-white hover:bg-white/[0.04] transition-all"
              style={{ borderColor: BORDER }}
            >
              View platform stats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
