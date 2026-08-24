import type { BookingStatus } from "@/Types/booking";

const styles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  awaiting_payment: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
  active: "bg-purple-100 text-purple-800",
  completed: "bg-teal-100 text-teal-800",
  disputed: "bg-red-100 text-red-700",
};

export default function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
