import type { OfferStatus } from "@/Types/offer";

const styles: Record<OfferStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  countered: "bg-blue-100 text-blue-800",
  withdrawn: "bg-gray-100 text-gray-700",
  completed: "bg-purple-100 text-purple-800",
};

export default function OfferStatusBadge({
  status,
}: {
  status: OfferStatus;
}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
