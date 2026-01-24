"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  label: string;
  value: number;
};

type ItemTrendCardProps = {
  title: string;
  unit: string;
  data: TrendPoint[];
  lastPrice?: number | null;
  delta7?: number | null;
  delta30?: number | null;
};

function formatDelta(delta?: number | null) {
  if (delta === null || delta === undefined) {
    return "n/a";
  }
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}`;
}

export function ItemTrendCard({
  title,
  unit,
  data,
  lastPrice,
  delta7,
  delta30,
}: ItemTrendCardProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--ink)]">
            {title}
          </h3>
          <p className="text-xs text-[color:var(--muted)]">{unit}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[color:var(--sea)]">
            {lastPrice !== null && lastPrice !== undefined
              ? `$${lastPrice.toFixed(2)}`
              : "n/a"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            latest
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-[color:var(--muted)]">
        <span>7d {formatDelta(delta7)}</span>
        <span>30d {formatDelta(delta30)}</span>
      </div>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          No history yet.
        </p>
      ) : (
        <div className="mt-3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #eadcc8",
                  background: "#fffaf4",
                  color: "#1f1b16",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2d6f67"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
