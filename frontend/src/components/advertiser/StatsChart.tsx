"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  dailyBreakdown: Array<{ date: string; impressions: number }>;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "10px",
  color: "#f8fafc",
  fontSize: 12,
  padding: "8px 12px",
};

export function StatsChart({ dailyBreakdown }: Props) {
  const maxVal = Math.max(...dailyBreakdown.map((d) => d.impressions), 1);

  const chartData = dailyBreakdown.map((d) => ({
    date: d.date.slice(5), // MM-DD
    impressions: d.impressions,
    isMax: d.impressions === maxVal,
  }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Delivery</p>
          <h2 className="text-base font-semibold text-white">Daily Impressions</h2>
        </div>
        {dailyBreakdown.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white font-mono tabular-nums">
              {dailyBreakdown.reduce((s, d) => s + d.impressions, 0).toLocaleString()}
            </p>
            <p className="text-slate-500 text-xs">total impressions</p>
          </div>
        )}
      </div>

      {dailyBreakdown.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl" aria-hidden="true">📊</div>
          <p className="text-slate-500 text-sm">No impression data yet</p>
          <p className="text-slate-600 text-xs">Data appears once your campaign goes live</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={38}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "rgba(59,130,246,0.05)" }}
              formatter={(value: number) => [value.toLocaleString(), "Impressions"]}
            />
            <Bar dataKey="impressions" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isMax ? "#3b82f6" : "#1e3a5f"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
