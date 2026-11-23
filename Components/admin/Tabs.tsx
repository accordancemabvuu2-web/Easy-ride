"use client";

import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/classNames";

export type TabItem = {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onSelect: () => void;
};

export default function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-hairline">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={item.active}
            onClick={item.onSelect}
            className={cx(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 pt-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              item.active
                ? "border-brand font-semibold text-ink"
                : "border-transparent font-medium text-subtle hover:text-ink",
            )}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
