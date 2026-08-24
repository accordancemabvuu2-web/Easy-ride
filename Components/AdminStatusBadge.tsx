"use client";

const styles: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  admin: "bg-slate-100 text-slate-800",
  buyer: "bg-sky-100 text-sky-800",
  seller: "bg-emerald-100 text-emerald-800",
  dealer: "bg-indigo-100 text-indigo-800",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
  open: "bg-amber-100 text-amber-800",
  identity: "bg-sky-100 text-sky-800",
  private_seller: "bg-indigo-100 text-indigo-800",
  listing_approved: "bg-green-100 text-green-800",
  listing_rejected: "bg-red-100 text-red-700",
  listing_suspended: "bg-gray-100 text-gray-700",
  listing_restored: "bg-green-100 text-green-800",
  report_resolved: "bg-green-100 text-green-800",
  support_ticket_updated: "bg-blue-100 text-blue-800",
  user_suspended: "bg-red-100 text-red-700",
  reviewing: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-700",
  resolved: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  investigating: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  awaiting_payment: "bg-amber-100 text-amber-800",
  completed: "bg-purple-100 text-purple-800",
  disputed: "bg-red-100 text-red-700",
  successful: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  processing: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  rented: "bg-indigo-100 text-indigo-800",
  sold: "bg-purple-100 text-purple-800",
  withdrawn: "bg-gray-100 text-gray-700",
  refunded: "bg-slate-100 text-slate-700",
  not_required: "bg-slate-100 text-slate-700",
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-700",
};

export default function AdminStatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
