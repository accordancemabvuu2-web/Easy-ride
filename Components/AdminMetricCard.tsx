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
    <div className="rounded-xl border border-[#CEDBD0] bg-white p-5 shadow-[0_2px_8px_rgba(23,37,30,0.04)]">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#52665B]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#17251E]">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-[#52665B]">{subtext}</p> : null}
    </div>
  );
}
