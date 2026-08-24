export default function PromotionPlanCard({
  title,
  description,
  amount,
  durationDays,
  currency,
  active,
  onSelect,
}: {
  title: string;
  description: string;
  amount: number;
  durationDays: number;
  currency: string;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 shadow-sm ${
        active ? "border-[#0B5D3B] ring-2 ring-[#0B5D3B]/10" : "border-[#E5E7EB]"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
        {title}
      </p>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-[#0B5D3B]">
            {currency} {amount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">{durationDays} days</p>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white"
        >
          Select
        </button>
      </div>
    </div>
  );
}
