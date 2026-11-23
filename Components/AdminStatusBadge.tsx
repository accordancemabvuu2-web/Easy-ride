"use client";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-[#eaf4ee] text-[#14664a]",
  warning: "bg-[#fdf3e1] text-[#8a5403]",
  danger: "bg-[#fbebe9] text-[#96271c]",
  info: "bg-[#ecf2f7] text-[#245a7c]",
  neutral: "bg-[#f0f3f1] text-[#54645c]",
};

const statusTones: Record<string, Tone> = {
  active: "success",
  approved: "success",
  resolved: "success",
  confirmed: "success",
  successful: "success",
  completed: "success",
  listing_approved: "success",
  listing_restored: "success",
  report_resolved: "success",
  low: "success",

  pending: "warning",
  under_review: "warning",
  awaiting_payment: "warning",
  open: "warning",
  medium: "warning",
  high: "warning",

  rejected: "danger",
  failed: "danger",
  disputed: "danger",
  urgent: "danger",
  user_suspended: "danger",

  in_progress: "info",
  investigating: "info",
  reviewing: "info",
  processing: "info",
  rented: "info",
  sold: "info",
  dealer: "info",
  identity: "info",
  private_seller: "info",
  seller: "info",
  buyer: "info",
  support_ticket_updated: "info",
  verification: "info",

  deleted: "neutral",
  suspended: "neutral",
  closed: "neutral",
  cancelled: "neutral",
  draft: "neutral",
  withdrawn: "neutral",
  refunded: "neutral",
  not_required: "neutral",
  admin: "neutral",
  listing_suspended: "neutral",
  user: "neutral",
};

/**
 * Status is never communicated by colour alone: every badge pairs a tone with
 * a dot and the humanised label.
 */
export default function AdminStatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = statusTones[status] ?? "neutral";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${toneClasses[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
