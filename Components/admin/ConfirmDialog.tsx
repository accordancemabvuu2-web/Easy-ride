"use client";

import { ArrowRight, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { cx } from "@/lib/classNames";
import { humanize } from "@/lib/format";

export type DialogPillTone = "success" | "warning" | "danger" | "info" | "neutral";

const pillTones: Record<DialogPillTone, string> = {
  success: "bg-[#eaf4ee] text-[#14664a]",
  warning: "bg-[#fdf3e1] text-[#8a5403]",
  danger: "bg-[#fbebe9] text-[#96271c]",
  info: "bg-[#ecf2f7] text-[#245a7c]",
  neutral: "bg-[#f0f3f1] text-[#54645c]",
};

export function DialogPill({ tone, label }: { tone: DialogPillTone; label: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        pillTones[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export function DialogTarget({
  name,
  email,
  id,
  initialsText,
}: {
  name: string;
  email?: string | null;
  id?: string | null;
  initialsText?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-[#fafbfa] px-3.5 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
        {initialsText ?? name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        {email ? <p className="truncate text-xs text-subtle">{email}</p> : null}
        {id ? <p className="truncate font-mono text-[11px] text-subtle">{id}</p> : null}
      </div>
    </div>
  );
}

export function DialogTransition({
  from,
  to,
}: {
  from: { label: string; text: string; tone: DialogPillTone };
  to: { label: string; text: string; tone: DialogPillTone };
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-hairline-soft px-3.5 py-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-subtle">{from.label}</span>
        <DialogPill tone={from.tone} label={from.text} />
      </div>
      <ArrowRight size={14} aria-hidden="true" className="text-subtle" />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-subtle">{to.label}</span>
        <DialogPill tone={to.tone} label={to.text} />
      </div>
    </div>
  );
}

export default function ConfirmDialog({
  title,
  description,
  tone = "danger",
  children,
  reason,
  confirmLabel,
  submitting = false,
  submitError,
  onCancel,
  onConfirm,
  onRefresh,
}: {
  title: string;
  description?: string;
  tone?: "danger" | "primary";
  children?: ReactNode;
  reason?: { label: string; help?: string; placeholder?: string; maxLength?: number };
  confirmLabel: string;
  submitting?: boolean;
  submitError?: { message: string; canRefresh?: boolean } | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  onRefresh?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const maxLength = reason?.maxLength ?? 1000;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    (reasonRef.current ?? dialog)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog?.open) dialog.close();
    };
    // Mount-only: each confirmation mounts a fresh dialog instance.
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (reason) {
      const normalized = value.trim();
      if (!normalized) {
        setValidationError("Enter a reason before confirming.");
        reasonRef.current?.focus();
        return;
      }
      if (normalized.length > maxLength) {
        setValidationError(`The reason must be ${maxLength.toLocaleString()} characters or fewer.`);
        reasonRef.current?.focus();
        return;
      }
      setValidationError(null);
      onConfirm(normalized);
      return;
    }

    onConfirm("");
  };

  const blocked = submitting;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
      aria-describedby={description ? "admin-confirm-description" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!blocked) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !blocked) onCancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-[14px] border border-hairline bg-surface p-0 text-ink shadow-2xl backdrop:bg-[#04140e]/45"
    >
      <div className="px-5 pb-0 pt-5">
        <div className="flex items-start gap-3">
          <span
            className={cx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              tone === "danger" ? "bg-[#fbebe9] text-[#96271c]" : "bg-brand-soft text-brand",
            )}
          >
            <ShieldAlert size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="admin-confirm-title" className="text-lg font-semibold tracking-[-0.015em] text-ink">
              {title}
            </h2>
            {description ? (
              <p id="admin-confirm-description" className="mt-0.5 text-xs text-subtle">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={blocked}
            onClick={onCancel}
            className="-mr-1 rounded-md p-1.5 text-subtle transition-colors hover:bg-[#f1f4f2] hover:text-ink disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="px-5 pb-1 pt-4">
          {children}
        </div>

        <div className="px-5">
          {reason ? (
            <div className="mt-3.5">
              <label
                htmlFor="admin-confirm-reason"
                className="flex items-center gap-2 text-xs font-medium text-ink"
              >
                {reason.label}
                <span className="rounded-full bg-[#fbebe9] px-2 py-0.5 text-[11px] font-medium text-danger-ink">
                  Required
                </span>
              </label>
              <textarea
                ref={reasonRef}
                id="admin-confirm-reason"
                name="reason"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (validationError) setValidationError(null);
                }}
                required
                maxLength={maxLength}
                rows={3}
                disabled={submitting}
                placeholder={reason.placeholder}
                aria-invalid={Boolean(validationError)}
                aria-describedby={`admin-confirm-reason-help${validationError ? " admin-confirm-reason-error" : ""}`}
                className="mt-1.5 w-full resize-y rounded-lg border border-[#d9e1dc] bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-brand focus:ring-[3px] focus:ring-[#0b5d3b]/15 disabled:bg-[#f7f9f8]"
              />
              <div className="mt-1.5 flex items-start justify-between gap-3 text-[11px] text-subtle">
                <span id="admin-confirm-reason-help">
                  {reason.help ?? "The reason is stored with this decision."}
                </span>
                <span className="shrink-0 tabular-nums">
                  {value.length}/{maxLength.toLocaleString()}
                </span>
                </div>
              {validationError ? (
                <p id="admin-confirm-reason-error" role="alert" className="mt-1.5 text-xs text-danger-ink">
                  {validationError}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <p>{submitError.message}</p>
              {submitError.canRefresh && onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={submitting}
                  className="mt-1.5 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  <RefreshCw size={12} aria-hidden="true" />
                  Refresh account details
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-hairline bg-[#fafbfa] px-5 py-3.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-muted transition-colors hover:bg-[#eff3f1] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (reason ? !value.trim() : false)}
            className={cx(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              tone === "danger"
                ? "bg-danger hover:bg-[#982016] focus-visible:outline-danger"
                : "bg-brand hover:bg-brand-strong focus-visible:outline-brand",
            )}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            {submitting ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Plain-language status label for dialog pill text. */
export function statusText(status: string): string {
  return humanize(status);
}
