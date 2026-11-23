import type { ReactNode } from "react";

export default function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.022em] text-ink">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-2 pb-0.5">
        {meta ? <span className="text-xs text-subtle tabular-nums">{meta}</span> : null}
        {actions}
      </div>
    </div>
  );
}
