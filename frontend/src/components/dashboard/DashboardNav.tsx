"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/payouts", label: "Payouts" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center h-9 px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
              isActive
                ? "bg-white/[0.09] text-white"
                : "text-white/48 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
