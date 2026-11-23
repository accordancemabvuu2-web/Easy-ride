import type { ReactNode } from "react";
import { cx } from "@/lib/classNames";

export default function Panel({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <section
      className={cx("rounded-xl border border-hairline bg-surface", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-hairline-soft px-4 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {count !== undefined ? count : null}
      </div>
      {action}
    </div>
  );
}
