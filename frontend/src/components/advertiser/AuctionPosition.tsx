"use client";

import type { AuctionBid } from "@/lib/api";

interface Props {
  bids: AuctionBid[];
  currentBid: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function AuctionPosition({ bids, currentBid }: Props) {
  const wouldWin = bids.length === 0 || currentBid > bids[0].bid_cpm;
  const position = bids.filter((b) => b.bid_cpm >= currentBid).length;
  const topBid = bids[0]?.bid_cpm ?? 0;
  const gapToWin = topBid > 0 ? (topBid + 0.01 - currentBid) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Live Auction</p>
          <h3 className="text-base font-semibold text-white">Your bid position</h3>
        </div>
        {currentBid > 0 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold ${
            wouldWin
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
          }`}>
            {wouldWin ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Winning
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                #{position + 1}
              </>
            )}
          </div>
        )}
      </div>

      {bids.length === 0 ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <p className="text-emerald-400 font-semibold text-sm">No competing bids</p>
          <p className="text-slate-400 text-xs mt-1">Your campaign will be the sole advertiser at launch</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bids.slice(0, 3).map((bid, i) => (
            <div
              key={bid.campaign_id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                i === 0 ? "bg-slate-800/60 border border-slate-700" : "bg-slate-800/20"
              }`}
            >
              <span className="text-base leading-none shrink-0">{MEDALS[i]}</span>
              <span className="text-slate-300 text-sm flex-1 truncate min-w-0">{bid.creative_text}</span>
              <span className="text-slate-400 text-sm font-mono tabular-nums shrink-0">${bid.bid_cpm.toFixed(2)}</span>
              {bid.impressions_remaining > 0 && (
                <span className="text-slate-600 text-xs shrink-0">{bid.impressions_remaining.toLocaleString()} left</span>
              )}
            </div>
          ))}

          {currentBid > 0 && (
            <>
              <div className="border-t border-slate-800 my-2" />
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                wouldWin
                  ? "bg-emerald-500/10 border-emerald-500/25"
                  : "bg-blue-500/10 border-blue-500/25"
              }`}>
                <span className="text-base leading-none shrink-0">{wouldWin ? "👑" : `#${position + 1}`}</span>
                <span className={`text-sm flex-1 font-medium ${wouldWin ? "text-emerald-300" : "text-blue-300"}`}>
                  Your campaign
                </span>
                <span className={`text-sm font-mono tabular-nums font-semibold ${wouldWin ? "text-emerald-300" : "text-blue-300"}`}>
                  ${currentBid.toFixed(2)}
                </span>
              </div>

              {!wouldWin && gapToWin > 0 && (
                <p className="text-xs text-amber-400/80 text-center pt-1">
                  Increase bid by ${gapToWin.toFixed(2)} to take the top position
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
