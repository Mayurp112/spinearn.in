"use client";

import { useState, useEffect } from "react";

const DEMO_ADS = [
  {
    brand: "Ramp",
    logo: "R",
    logoBg: "bg-green-500",
    logoFg: "text-white",
    text: "Ramp · save time and money on finance →",
    tool: "Glob",
  },
  {
    brand: "Linear",
    logo: "L",
    logoBg: "bg-violet-500",
    logoFg: "text-white",
    text: "Linear · build software like the best →",
    tool: "Grep",
  },
  {
    brand: "Vercel",
    logo: "▲",
    logoBg: "bg-white",
    logoFg: "text-black",
    text: "Vercel · deploy in seconds, scale forever",
    tool: "Read",
  },
  {
    brand: "Warp",
    logo: "W",
    logoBg: "bg-yellow-400",
    logoFg: "text-black",
    text: "Warp Terminal · the AI-native terminal →",
    tool: "Write",
  },
];

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const STOCK_PHRASES = ["Percolating ..", "Thinking ..", "Analyzing ..", "Processing .."];

export function SpinnerDemo() {
  const [frame, setFrame] = useState(0);
  const [adIdx, setAdIdx] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [secs, setSecs] = useState(0.0);

  // Spinner rotation + elapsed counter
  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
      setSecs((s) => +(s + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Cycle to next ad every 4.5s
  useEffect(() => {
    const id = setInterval(() => {
      setAdIdx((i) => (i + 1) % DEMO_ADS.length);
      setPhraseIdx((i) => (i + 1) % STOCK_PHRASES.length);
      setTyped(0);
      setSecs(0);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Typewriter effect for ad text
  useEffect(() => {
    const ad = DEMO_ADS[adIdx];
    if (typed >= ad.text.length) return;
    const id = setTimeout(() => setTyped((t) => t + 1), 28);
    return () => clearTimeout(id);
  }, [typed, adIdx]);

  const ad = DEMO_ADS[adIdx];
  const displayText = ad.text.slice(0, typed);
  const isTyping = typed < ad.text.length;

  return (
    <div className="relative mx-auto max-w-3xl w-full select-none">
      {/* Ambient glow */}
      <div
        className="absolute inset-x-8 inset-y-4 bg-blue-500/25 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Terminal window */}
      <div className="relative rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/5">

        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-900/90 border-b border-white/5">
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-slate-500 text-xs font-mono ml-auto pr-2 tracking-wide">
            claude-code — bash — 120×32
          </span>
        </div>

        {/* Two-column before / after */}
        <div className="grid grid-cols-2 divide-x divide-white/5 min-h-[140px]">

          {/* LEFT: Stock Claude Code */}
          <div className="p-6 sm:p-7 space-y-4">
            <p className="text-slate-600 text-[10px] uppercase tracking-[0.18em] font-bold">
              Stock Claude Code
            </p>
            <div className="font-mono space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400 text-sm leading-none">
                <span className="text-orange-400/80 shrink-0">●</span>
                <span className="text-blue-400/80 shrink-0 w-4 text-center">{FRAMES[frame]}</span>
                <span className="text-slate-400 truncate">{STOCK_PHRASES[phraseIdx]}</span>
              </div>
              <div className="text-slate-700 text-xs pl-8 font-mono tabular-nums">
                {ad.tool} · {secs}s
              </div>
            </div>
          </div>

          {/* RIGHT: With SpinEarn */}
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-blue-400 text-[10px] uppercase tracking-[0.18em] font-bold">
                With SpinEarn
              </p>
              <span className="text-[10px] text-slate-700 font-mono border border-slate-700 rounded px-1">
                ad
              </span>
            </div>
            <div className="font-mono space-y-1.5">
              <div className="flex items-center gap-2 text-sm leading-none">
                <span className="text-orange-400/80 shrink-0">●</span>
                <span className="text-blue-400/80 shrink-0 w-4 text-center">{FRAMES[frame]}</span>
                {/* Brand logo box */}
                <span
                  className={`shrink-0 w-[18px] h-[18px] rounded text-[10px] font-black flex items-center justify-center leading-none ${ad.logoBg} ${ad.logoFg}`}
                  aria-hidden="true"
                >
                  {ad.logo}
                </span>
                <span className="text-slate-200 truncate">
                  {displayText}
                  {isTyping && (
                    <span className="text-blue-400 animate-pulse">▋</span>
                  )}
                </span>
              </div>
              <div className="text-slate-700 text-xs pl-8 font-mono tabular-nums">
                {ad.tool} · {secs}s
              </div>
            </div>
          </div>
        </div>

        {/* Ad cycling indicator dots */}
        <div className="flex items-center justify-center gap-1.5 pb-3 pt-1" aria-hidden="true">
          {DEMO_ADS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i === adIdx
                  ? "w-4 h-1.5 bg-blue-500"
                  : "w-1.5 h-1.5 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Install strip */}
        <div className="border-t border-white/5 bg-slate-900/60 px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-xs font-mono">
            <span className="text-slate-600">$ </span>
            <span className="text-green-400 font-semibold">code --install-extension spinearn.spinearn</span>
          </p>
          <p className="text-slate-600 text-xs shrink-0 hidden sm:block">VS Code + Claude Code</p>
        </div>
      </div>
    </div>
  );
}
