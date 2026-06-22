import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRoas(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function campaignStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    paused: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    exhausted: "bg-slate-500/15 text-slate-400 border border-slate-500/25",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/25",
    pending_payment: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  };
  return colors[status] ?? "bg-slate-500/15 text-slate-400 border border-slate-500/25";
}

export function payoutStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    processing: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    failed: "bg-red-500/15 text-red-400 border border-red-500/25",
  };
  return colors[status] ?? "bg-slate-500/15 text-slate-400 border border-slate-500/25";
}

export function payoutStatusDot(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-400",
    processing: "bg-blue-400",
    completed: "bg-emerald-400",
    failed: "bg-red-400",
  };
  return colors[status] ?? "bg-slate-400";
}
