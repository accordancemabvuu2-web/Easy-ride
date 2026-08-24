"use client";

export default function AdminMetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#121212]">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-gray-500">{subtext}</p> : null}
    </div>
  );
}
