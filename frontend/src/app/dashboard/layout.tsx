import Link from "next/link";
import { type ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav
        className="sticky top-0 z-50 h-14 px-4 sm:px-6"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          background: "rgba(10,10,10,0.88)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-full gap-4">
          <div className="flex items-center gap-5 sm:gap-8 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-7 h-7 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
                <span className="text-[11px] font-black text-white leading-none">S</span>
              </div>
              <span className="text-[14px] font-bold tracking-[-0.02em] text-white hidden sm:inline">SpinEarn</span>
            </Link>
            <DashboardNav />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-[13px] text-white/35 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              Live
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />
            <Link
              href="/advertise"
              className="inline-flex items-center h-9 px-4 rounded-xl text-[13px] font-semibold text-white/55 hover:text-white transition-all duration-150 border hover:bg-white/[0.05]"
              style={{ borderColor: "rgba(255,255,255,0.09)" }}
            >
              Advertise →
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10">{children}</main>
    </div>
  );
}
