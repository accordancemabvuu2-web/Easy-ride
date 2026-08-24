import type { RentalBooking } from "@/Types/booking";

export default function PaymentSummary({
  booking,
}: {
  booking: RentalBooking;
}) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Payment summary</h2>

      <div className="mt-5 space-y-3 text-sm">
        <Row label="Daily rate" value={`${booking.currency} ${booking.dailyRate.toLocaleString()}`} />
        <Row label="Days" value={String(booking.totalDays)} />
        <Row label="Subtotal" value={`${booking.currency} ${booking.subtotal.toFixed(2)}`} />
        <Row label="Service fee" value={`${booking.currency} ${booking.serviceFee.toFixed(2)}`} />
        <Row label="Deposit" value={`${booking.currency} ${booking.deposit.toFixed(2)}`} />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
        <span className="font-semibold text-gray-500">Total</span>
        <span className="text-lg font-bold text-[#0B5D3B]">
          {booking.currency} {booking.totalAmount.toFixed(2)}
        </span>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
