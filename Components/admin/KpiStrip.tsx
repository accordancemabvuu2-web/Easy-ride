import type { LucideIcon } from "lucide-react";

export type KpiItem = {
  label: string;
  value: string;
  detail?: string;
  detailIcon?: LucideIcon;
  unavailable?: boolean;
};

/**
 * Present-state totals only. A metric that could not be read renders as
 * unavailable rather than as zero.
 */
export default function KpiStrip({
  items,
  loading,
  failed,
}: {
  items: KpiItem[];
  loading?: boolean;
  failed?: boolean;
}) {
  return (
    <section
      aria-label="Marketplace totals"
      className="overflow-hidden rounded-xl border border-hairline bg-hairline-soft"
    >
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const DetailIcon = item.detailIcon;
          const unavailable = !loading && (failed || item.unavailable);
          return (
            <div key={item.label} className="bg-surface px-4 py-4 sm:px-5">
              <p className="text-xs font-medium text-subtle">{item.label}</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink tabular-nums">
                {loading || unavailable ? "—" : item.value}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                {DetailIcon ? (
                  <DetailIcon size={12} aria-hidden="true" className="text-subtle" />
                ) : null}
                <span>
                  {loading ? "Loading" : unavailable ? "Unavailable" : item.detail}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
