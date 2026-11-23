"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cx } from "@/lib/classNames";
import { humanize, initials } from "@/lib/format";
import {
  CalendarDays,
  Car,
  CreditCard,
  Flag,
  Gauge,
  Handshake,
  Headphones,
  History,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Shield,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = { label: string; href: string; icon: LucideIcon };

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operations",
    items: [
      { label: "Overview", href: "/admin", icon: Gauge },
      { label: "Support", href: "/admin/support", icon: Headphones },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { label: "Listings", href: "/admin/listings", icon: Car },
      { label: "Verification", href: "/admin/verification", icon: ShieldCheck },
      { label: "Reports", href: "/admin/reports", icon: Flag },
    ],
  },
  {
    label: "Transactions",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
      { label: "Offers", href: "/admin/offers", icon: Handshake },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Disputes", href: "/admin/disputes", icon: Scale },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "Audit logs", href: "/admin/audit-logs", icon: History }],
  },
];

const privileged: NavItem[] = [
  { label: "Accounts", href: "/admin/users", icon: Users },
  { label: "Administrators", href: "/admin/users?view=oversight", icon: Lock },
];

function isActive(pathname: string, href: string, oversightView: boolean): boolean {
  const path = href.split("?")[0];
  const wantsOversight = href.includes("view=oversight");

  if (path === "/admin/users") {
    if (pathname === "/admin/users") return wantsOversight ? oversightView : !oversightView;
    return wantsOversight ? false : pathname.startsWith("/admin/users/");
  }

  if (path === "/admin") return pathname === "/admin";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function AdminSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const oversightView = searchParams.get("view") === "oversight";
  const { logout, profile, isSuperAdmin } = useAuth();

  const roleLabel = isSuperAdmin
    ? "Super administrator"
    : profile?.adminRole
      ? humanize(profile.adminRole)
      : "Administrator";

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href, oversightView);

    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        onClick={onCloseMobile}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
          collapsed && "lg:justify-center lg:px-0",
          active
            ? "bg-white font-semibold text-forest shadow-sm"
            : "text-white/75 hover:bg-white/[0.07] hover:text-white",
        )}
      >
        <Icon
          size={16}
          aria-hidden="true"
          className={cx("shrink-0", active ? "text-brand" : "text-white/50")}
        />
        <span className={cx("truncate", collapsed && "lg:hidden")}>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close admin navigation overlay"
          onClick={onCloseMobile}
          className="fixed inset-0 z-[70] bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-[80] flex w-72 flex-col bg-forest text-white transition-transform duration-200 lg:translate-x-0 lg:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[76px]" : "lg:w-72",
        )}
      >
        <div
          className={cx(
            "flex h-[88px] shrink-0 items-center gap-3 border-b border-white/10 px-5",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-[#e2c466] to-gold text-[13.5px] font-bold text-forest">
              ER
            </span>
            <span className={cx("min-w-0", collapsed && "lg:hidden")}>
              <span className="block truncate text-[15px] font-semibold leading-tight">Easy Ride</span>
              <span className="block text-[11.5px] text-white/50">Administration</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close admin navigation"
            className="ml-auto rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 pb-2 pt-3.5">
          {groups.map((group) => (
            <div key={group.label} className="mb-3.5">
              <p
                className={cx(
                  "px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/35",
                  collapsed && "lg:hidden",
                )}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">{group.items.map(renderItem)}</div>
            </div>
          ))}

          {isSuperAdmin ? (
            <div className="mt-1 border-t border-white/10 pt-3">
              <p
                className={cx(
                  "flex items-center gap-1.5 px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/45",
                  collapsed && "lg:hidden",
                )}
              >
                <Shield size={11} aria-hidden="true" className="text-gold" />
                Super administrator
              </p>
              <div className="space-y-0.5">{privileged.map(renderItem)}</div>
            </div>
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className={cx("flex items-center gap-2.5 rounded-lg p-2", collapsed && "lg:justify-center lg:p-0")}>
            <span
              title={profile?.name ?? "Administrator"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-white"
            >
              {initials(profile?.name)}
            </span>
            <div className={cx("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[13px] font-semibold">{profile?.name ?? "Administrator"}</p>
              <p className="truncate text-[11.5px] text-white/50">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Log out"
              className={cx(
                "rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white",
                collapsed && "lg:hidden",
              )}
            >
              <LogOut size={15} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className={cx(
              "mt-1.5 hidden w-full items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:flex",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={15} aria-hidden="true" />
            )}
            <span className={cx(collapsed && "lg:hidden")}>{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
