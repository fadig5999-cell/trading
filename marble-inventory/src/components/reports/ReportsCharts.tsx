"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TopSoldChart({
  data,
}: {
  data: { name: string; quantity: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">אין עדיין נתוני מכירות</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e5e9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e3e5e9",
            fontSize: 13,
            direction: "rtl",
          }}
        />
        <Bar dataKey="quantity" name="לוחות שנמכרו" fill="#a68a52" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlySalesChart({
  data,
}: {
  data: { month: string; quantity: number; revenue: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">אין עדיין נתוני מכירות</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e5e9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e3e5e9",
            fontSize: 13,
            direction: "rtl",
          }}
        />
        <Line
          type="monotone"
          dataKey="quantity"
          name="לוחות שנמכרו"
          stroke="#1c1f24"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
