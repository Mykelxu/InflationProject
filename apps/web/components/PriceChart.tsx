"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  price: number;
};

type PriceChartProps = {
  data: ChartPoint[];
};

export function PriceChart({ data }: PriceChartProps) {
  return (
    <div className="h-72 w-full rounded-2xl border border-[color:var(--ring)] bg-[color:var(--surface)] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 24, left: -6, bottom: 8 }}>
          <XAxis dataKey="label" stroke="#6c6258" fontSize={12} />
          <YAxis stroke="#6c6258" fontSize={12} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #eadcc8",
              background: "#fffaf4",
              color: "#1f1b16",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Basket"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#d55d3a"
            strokeWidth={3}
            dot={{ r: 4, fill: "#d55d3a" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
