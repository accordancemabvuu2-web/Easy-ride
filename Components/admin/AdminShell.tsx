"use client";

import { cx } from "@/lib/classNames";
import { inter } from "@/lib/fonts";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "@/Components/AdminSidebar";

const COLLAPSE_KEY = "easy-ride:admin-sidebar";

export default function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "collapsed");
    } catch {
      // Storage can be unavailable in private browsing; default to expanded.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Persisting the preference is best-effort only.
      }
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className={cx(inter.className, "min-h-screen bg-canvas text-ink")}>
      <Suspense fallback={null}>
        <AdminSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMobile}
        />
      </Suspense>
      <div
        className={cx(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-72",
        )}
      >
        <AdminHeader onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
