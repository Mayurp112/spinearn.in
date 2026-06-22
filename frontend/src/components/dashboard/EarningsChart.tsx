"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DeveloperEarnings } from "@/lib/api";

interface Props {
  data: DeveloperEarnings;
}

const GRID_COLOR = "#1e293b";
const AXIS_COLOR = "#475569";
const TICK = { fill: "#64748b", fontSize: 11 };
const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: 12,
};

function Legend2({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-400">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function EarningsChart({ data }: Props) {
  const points = data.data_points.map((p) => ({
    label: p.label,
    impression_earned: parseFloat(String(p.impression_earned ?? 0)),
    click_earned: parseFloat(String(p.click_earned ?? 0)),
    impression_count: Number(p.impression_count ?? 0),
    click_count: Number(p.click_count ?? 0),
  }));

  if (points.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          No data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Earnings breakdown — stacked area */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Earnings</h2>
          <Legend2
            items={[
              { color: "#3b82f6", label: "Impressions" },
              { color: "#8b5cf6", label: "Clicks" },
            ]}
          />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="impEarnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clkEarnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} tick={TICK} tickLine={false} />
            <YAxis
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(3)}`}
              width={62}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                `$${value.toFixed(4)}`,
                name === "impression_earned" ? "Impression earnings" : "Click earnings",
              ]}
            />
            <Area
              type="monotone"
              dataKey="impression_earned"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#impEarnGrad)"
              stackId="earn"
            />
            <Area
              type="monotone"
              dataKey="click_earned"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#clkEarnGrad)"
              stackId="earn"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Volume — grouped bars */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Volume</h2>
          <Legend2
            items={[
              { color: "#0ea5e9", label: "Impressions" },
              { color: "#10b981", label: "Clicks" },
            ]}
          />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={points}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} tick={TICK} tickLine={false} />
            <YAxis
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === "impression_count" ? "Impressions" : "Clicks",
              ]}
            />
            <Bar dataKey="impression_count" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            <Bar dataKey="click_count" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
