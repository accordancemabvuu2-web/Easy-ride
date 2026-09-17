"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  CalendarDays,
  CarFront,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type DashboardRole = "buyer" | "seller";

interface DashboardShellProps {
  role: DashboardRole;
  children: ReactNode;
}

const buyerLinks = [
  { label: "Dashboard", href: "/dashboard/buyer", icon: LayoutDashboard },
  { label: "Browse Cars", href: "/", icon: Search },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Offers", href: "/offers", icon: BadgeDollarSign },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Support", href: "/support", icon: ShieldCheck },
];

const sellerLinks = [
  { label: "Dashboard", href: "/dashboard/seller", icon: LayoutDashboard },
  { label: "My Listings", href: "/dashboard/seller", icon: CarFront },
  { label: "Add Vehicle", href: "/create-listing", icon: Plus },
  { label: "Offers", href: "/offers", icon: BadgeDollarSign },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Analytics", href: "/dealer/analytics", icon: BarChart3 },
  { label: "Promotions", href: "/promote", icon: Store },
];

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const { profile, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = role === "buyer" ? buyerLinks : sellerLinks;
  const otherRole = role === "buyer" ? "seller" : "buyer";
  const otherHref = otherRole === "buyer" ? "/dashboard/buyer" : "/dashboard/seller";

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-[#F5F7F6] text-[#17201D]">
      <header className="sticky top-0 z-40 border-b border-[#DCE5DF] bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-black text-[#063F2C]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#063F2C] text-sm text-white">ER</span>
            Easy Ride
          </Link>
          <button
            type="button"
            aria-label="Toggle dashboard navigation"
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-xl border border-[#DCE5DF] p-2 text-[#063F2C]"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className={`${mobileOpen ? "fixed inset-x-3 top-[72px] z-50" : "hidden"} w-auto shrink-0 rounded-3xl border border-[#DCE5DF] bg-[#063F2C] p-4 text-white shadow-xl lg:sticky lg:top-5 lg:block lg:h-[calc(100vh-40px)] lg:w-64 lg:rounded-none lg:border-0 lg:bg-[#063F2C] lg:shadow-none`}>
          <div className="hidden items-center gap-3 px-3 py-4 lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7B319] font-black text-[#063F2C]">ER</span>
            <div>
              <p className="font-black tracking-tight">EASY<span className="text-[#E7B319]">RIDE</span></p>
              <p className="text-xs text-white/60">{role === "buyer" ? "Marketplace" : "Seller studio"}</p>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8E6C3]">Current mode</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold">
                {role === "buyer" ? <Search size={16} /> : <Store size={16} />}
                {role === "buyer" ? "Buyer" : "Seller"}
              </span>
              <Link href={otherHref} onClick={closeMobile} className="text-xs font-bold text-[#E7B319] hover:underline">
                Switch
              </Link>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href && link.href !== "/";

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white text-[#063F2C]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-white/10 pt-4">
            <Link href="/dashboard/profile" onClick={closeMobile} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">
              <UserRound size={18} /> Profile
            </Link>
            <Link href="/dashboard/settings" onClick={closeMobile} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">
              <Settings size={18} /> Settings
            </Link>
            <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-200 hover:bg-red-400/15">
              <LogOut size={18} /> Log out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 hidden items-center justify-between lg:flex">
              <div>
                <p className="text-sm font-semibold text-[#08784D]">{role === "buyer" ? "Buyer workspace" : "Seller workspace"}</p>
                <p className="mt-1 text-sm text-gray-500">{profile?.email}</p>
              </div>
              <Link href="/" className="rounded-full border border-[#C9D6CE] bg-white px-4 py-2 text-sm font-bold text-[#063F2C] hover:border-[#08784D]">
                View marketplace
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}