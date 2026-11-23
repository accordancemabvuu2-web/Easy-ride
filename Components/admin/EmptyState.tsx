import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/classNames";

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  compact,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon size={17} aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-xs leading-5 text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
