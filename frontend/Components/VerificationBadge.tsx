"use client";

export default function VerificationBadge({
  verified,
  label = "Verified",
}: {
  verified: boolean;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        verified
          ? "bg-[#0B5D3B]/10 text-[#0B5D3B]"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {verified ? label : "Pending review"}
    </span>
  );
}
