"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdvertiseNav() {
  const pathname = usePathname();
  const isCampaigns = pathname === "/advertise" || (pathname.startsWith("/advertise/") && !pathname.includes("/new"));
  const isNew = pathname === "/advertise/new";

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/advertise"
        className={`inline-flex items-center h-9 px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
          isCampaigns
            ? "bg-white/[0.09] text-white"
            : "text-white/48 hover:text-white hover:bg-white/[0.05]"
        }`}
      >
        Campaigns
      </Link>
      <Link
        href="/advertise/new"
        className={`inline-flex items-center h-9 px-4 gap-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150 shadow-lg shadow-blue-500/20 ${
          isNew ? "bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        <span className="text-base leading-none" aria-hidden="true">+</span>
        New campaign
      </Link>
    </div>
  );
}
