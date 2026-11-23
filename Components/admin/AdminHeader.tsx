"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cx } from "@/lib/classNames";
import { humanize, initials } from "@/lib/format";
import { ChevronDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PAGE_LABELS: Record<string, string> = {
  "": "Overview",
  users: "Accounts",
  listings: "Listings",
  reports: "Reports",
  bookings: "Bookings",
  offers: "Offers",
  payments: "Payments",
  support: "Support",
  verification: "Verification",
  "audit-logs": "Audit logs",
  disputes: "Disputes",
};

const GROUP_BY_PAGE: Record<string, string> = {
  "": "Operations",
  support: "Operations",
  listings: "Marketplace",
  verification: "Marketplace",
  reports: "Marketplace",
  bookings: "Transactions",
  offers: "Transactions",
  payments: "Transactions",
  disputes: "Transactions",
  "audit-logs": "Administration",
  users: "Administration",
};

export default function AdminHeader({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const pathname = usePathname();
  const { profile, isSuperAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const segments = pathname.split("/").filter(Boolean);
  const page = segments[1] ?? "";
  const group = GROUP_BY_PAGE[page] ?? "Operations";
  const pageLabel = PAGE_LABELS[page] ?? humanize(page);

  const roleLabel = isSuperAdmin
    ? "Super administrator"
    : profile?.adminRole
      ? humanize(profile.adminRole)
      : "Administrator";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open admin navigation"
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#eff3f1] hover:text-ink lg:hidden"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2 text-[13px]">
            <li className="truncate text-subtle">{group}</li>
            <li aria-hidden="true" className="text-[#c6d0ca]">
              /
            </li>
            <li className="truncate font-medium text-ink">{pageLabel}</li>
            {segments[2] ? (
              <>
                <li aria-hidden="true" className="text-[#c6d0ca]">
                  /
                </li>
                <li className="truncate text-subtle">Account</li>
              </>
            ) : null}
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-[#e7dbb2] bg-[#fbf7e8] px-2.5 py-1 text-xs font-medium text-[#6d5716] sm:inline-flex">
          <ShieldCheck size={12} aria-hidden="true" className="text-[#a98a22]" />
          {roleLabel}
        </span>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex h-9 items-center gap-2 rounded-full pl-1 pr-2 text-[13px] font-medium text-ink transition-colors hover:bg-[#f1f4f2]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
              {initials(profile?.name)}
            </span>
            <span className="hidden max-w-40 truncate sm:inline">{profile?.name ?? "Administrator"}</span>
            <ChevronDown size={13} aria-hidden="true" className="text-subtle" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-64 overflow-hidden rounded-lg border border-hairline bg-surface shadow-lg"
            >
              <div className="border-b border-hairline-soft px-3.5 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">{profile?.name ?? "Administrator"}</p>
                <p className="mt-0.5 truncate text-xs text-subtle">{profile?.email}</p>
                <p className="mt-1.5 text-[11px] font-medium text-subtle">{roleLabel}</p>
              </div>
              <div className="p-1">
                <Link
                  href="/"
                  role="menuitem"
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-[#eff3f1] hover:text-ink"
                >
                  View marketplace
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-danger-ink transition-colors hover:bg-[#fbebe9]",
                  )}
                >
                  <LogOut size={14} aria-hidden="true" />
                  Log out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
