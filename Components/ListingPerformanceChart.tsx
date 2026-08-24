"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ListingPerformanceChart({
  data,
}: {
  data: Array<{ name: string; views: number; leads: number }>;
}) {
  return (
    <div className="h-[320px] rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="views" fill="#0B5D3B" radius={[8, 8, 0, 0]} />
          <Bar dataKey="leads" fill="#C9A227" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
