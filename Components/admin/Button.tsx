import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/classNames";

export type ButtonVariant = "primary" | "outline" | "quiet" | "danger" | "dangerOutline";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  outline: "border-hairline bg-surface text-ink hover:border-[#c2d0c8] hover:bg-[#f6f8f7]",
  quiet: "text-muted hover:bg-[#eff3f1] hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#982016] focus-visible:outline-danger",
  dangerOutline: "border-[#e8c7c2] bg-surface text-danger-ink hover:bg-[#fdf1ef]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
