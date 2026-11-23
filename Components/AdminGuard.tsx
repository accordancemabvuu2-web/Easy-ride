"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cx } from "@/lib/classNames";
import { inter } from "@/lib/fonts";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, isAdmin, isSuperAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div
        className={cx(inter.className, "flex min-h-screen items-center justify-center bg-canvas")}
        role="status"
        aria-label="Checking administrator access"
      >
        <Loader2 className="animate-spin text-brand" size={28} aria-hidden="true" />
      </div>
    );
  }

  const activeUser = user || profile;
  const hasAccess = Boolean(
    activeUser &&
      (isAdmin ||
        isSuperAdmin ||
        activeUser.role === "admin" ||
        activeUser.role === "super_admin" ||
        Boolean(activeUser.adminRole)),
  );

  if (!hasAccess) {
    return (
      <main
        className={cx(
          inter.className,
          "flex min-h-screen items-center justify-center bg-canvas px-4",
        )}
      >
        <section className="w-full max-w-md rounded-xl border border-hairline bg-surface px-6 py-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-[-0.015em] text-ink">
            Administrator access required
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted">
            Your account does not have the administrative privileges required to open the Easy Ride
            administration portal.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-hairline px-3.5 text-sm font-medium text-ink transition-colors hover:bg-[#f6f8f7]"
            >
              Return home
            </Link>
            <Link
              href="/login?next=/admin"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Sign in as administrator
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
