"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  BadgeDollarSign,
  CalendarDays,
  Car,
  FileWarning,
  Gauge,
  Handshake,
  Headphones,
  History,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { label: "Overview", href: "/admin", icon: Gauge },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Listings", href: "/admin/listings", icon: Car },
  { label: "Reports", href: "/admin/reports", icon: FileWarning },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
  { label: "Offers", href: "/admin/offers", icon: Handshake },
  { label: "Payments", href: "/admin/payments", icon: BadgeDollarSign },
  { label: "Support", href: "/admin/support", icon: Headphones },
  { label: "Verification", href: "/admin/verification", icon: ShieldCheck },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout, profile } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open admin navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-[70] rounded-xl bg-[#0B5D3B] p-3 text-white shadow-lg lg:hidden"
      >
        <Menu />
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close admin navigation overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-72 flex-col bg-[#073F2B] text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C9A227] font-bold text-[#121212]">
              ER
            </div>

            <div>
              <p className="text-lg font-bold">Easy Ride</p>
              <p className="text-xs text-white/55">Administration</p>
            </div>
          </Link>

          <button type="button" onClick={() => setOpen(false)} className="lg:hidden">
            <X />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {links.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition ${
                  active ? "bg-white text-[#0B5D3B]" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="truncate font-semibold">{profile?.name ?? "Administrator"}</p>
            <p className="mt-1 truncate text-xs text-white/55">{profile?.email}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-200 hover:bg-red-500/15"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
