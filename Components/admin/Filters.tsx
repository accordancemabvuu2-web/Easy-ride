"use client";

import { ChevronDown, Search } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { cx } from "@/lib/classNames";

const control =
  "h-9 w-full rounded-lg border border-[#d9e1dc] bg-surface px-2.5 text-sm text-ink transition placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-[#0b5d3b]/15 disabled:cursor-not-allowed disabled:bg-[#f7f9f8]";

const labelClass = "text-xs font-medium text-subtle";

export function SearchField({
  id,
  label = "Search",
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative flex items-center">
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-subtle"
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={cx(control, "pl-9")}
        />
      </div>
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  disabled,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex w-full flex-col gap-1.5 sm:w-48 sm:shrink-0", className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cx(control, "appearance-none pr-8")}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
        />
      </div>
    </div>
  );
}
