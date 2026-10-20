"use client";

import { useAuth } from "@/contexts/AuthContext";
import { SellerRouteContext } from "@/Components/SellerRouteContext";
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
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useContext, useState, type ReactNode } from "react";

type DashboardRole = "personal" | "buyer" | "seller";

interface DashboardShellProps {
  role: DashboardRole;
  children: ReactNode;
}

const buyerLinks = [
  { label: "Dashboard", href: "/dashboard/buyer", icon: LayoutDashboard },
  { label: "Buy Vehicles", href: "/dashboard/buyer?mode=buy", icon: Search },
  { label: "Rent Vehicles", href: "/dashboard/buyer?mode=rent", icon: CalendarDays },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Offers", href: "/offers", icon: BadgeDollarSign },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Support", href: "/support", icon: ShieldCheck },
];

const sellerLinks = [
  { label: "Dashboard", href: "/dashboard/seller", icon: LayoutDashboard },
  { label: "Inventory", href: "/dashboard/seller/inventory", icon: CarFront },
  { label: "Leads", href: "/dashboard/seller/leads", icon: Users },
  { label: "Rental Management", href: "/dashboard/seller/rentals", icon: CalendarDays },
  { label: "Add Vehicle", href: "/dashboard/seller/add-vehicle", icon: Plus },
  { label: "Favorites", href: "/dashboard/seller/favorites", icon: Heart },
  { label: "Offers", href: "/dashboard/seller/offers", icon: BadgeDollarSign },
  { label: "Messages", href: "/dashboard/seller/messages", icon: MessageCircle },
  { label: "Notifications", href: "/dashboard/seller/notifications", icon: Bell },
  { label: "Support", href: "/dashboard/seller/support", icon: ShieldCheck },
  { label: "Bookings", href: "/dashboard/seller/bookings", icon: CalendarDays },
  { label: "Analytics", href: "/dashboard/seller/analytics", icon: BarChart3 },
  { label: "Promotions", href: "/dashboard/seller/promotions", icon: Store },
];

const personalLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Buy vehicles", href: "/dashboard?mode=buy", icon: Search },
  { label: "Rent vehicles", href: "/dashboard?mode=rent", icon: CalendarDays },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Offers", href: "/offers", icon: BadgeDollarSign },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Support", href: "/support", icon: ShieldCheck },
];

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const insidePersistentSellerShell = useContext(SellerRouteContext);
  const { profile, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isSellerRoute = pathname.startsWith("/dashboard/seller");
  const activeRole = isSellerRoute || profile?.role === "seller" || profile?.role === "dealer"
    ? "seller"
    : profile?.role === "buyer"
      ? "buyer"
      : role;
  const links = activeRole === "personal" ? personalLinks : activeRole === "buyer" ? buyerLinks : sellerLinks;
  const displayName = profile?.name?.trim() || "Guest";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = search.trim();
    router.push(value ? `/marketplace?q=${encodeURIComponent(value)}` : "/marketplace");
  };

  const closeMobile = () => setMobileOpen(false);

  if (insidePersistentSellerShell) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#F4F7F3] text-[#17251E]">
      <header className="sticky top-0 z-40 border-b border-[#E4EAE6] bg-white/95 backdrop-blur lg:hidden">
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

      <div className="relative min-h-screen w-full lg:pl-[270px]">
        <aside className={`${mobileOpen ? "fixed inset-x-3 top-[72px] z-50" : "hidden"} w-auto shrink-0 rounded-xl border border-[#063F2F] bg-[#063F2F] p-4 text-white shadow-xl lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:h-screen lg:w-[270px] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-[#063F2F] lg:shadow-none`}>
          <div className="hidden items-center gap-3 px-3 py-4 lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7B319] font-black text-[#063F2C]">ER</span>
            <div>
              <p className="font-black tracking-tight">EASY<span className="text-[#E7B319]">RIDE</span></p>
              <p className="text-xs text-white/60">{activeRole === "personal" ? "Personal account" : activeRole === "buyer" ? "Marketplace" : "Seller studio"}</p>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-white/20 bg-white/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A8E6C3]">Current mode</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold">
                {activeRole === "personal" ? <UserRound size={16} /> : activeRole === "buyer" ? <Search size={16} /> : <Store size={16} />}
                {activeRole === "personal" ? "Personal" : activeRole === "buyer" ? "Buyer" : "Seller"}
              </span>
              {activeRole === "personal" ? <Link href="/dealer/apply" onClick={closeMobile} className="text-xs font-bold text-[#E7B319] hover:underline">Become a Dealer</Link> : null}
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const linkPath = link.href.split("?")[0];
              const linkQuery = new URLSearchParams(link.href.split("?")[1] ?? "");
              const hasQuerySiblings = links.some((candidate) => {
                const candidateQuery = new URLSearchParams(candidate.href.split("?")[1] ?? "");
                return candidate.href.split("?")[0] === linkPath && candidateQuery.toString().length > 0;
              });
              const queryMatches = [...linkQuery.entries()].every(([key, value]) => searchParams.get(key) === value);
              const active = pathname === linkPath && linkPath !== "/" && (
                linkQuery.size ? queryMatches : !hasQuerySiblings || searchParams.size === 0
              );

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMobile}
                  className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[#A8E6C3] bg-white text-[#063F2C] shadow-sm" : "border-transparent text-white/75 hover:bg-white/10 hover:text-white"}`}
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

        <main className="min-h-screen min-w-0 bg-[#F4F7F3] px-4 py-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-8 hidden items-center justify-between gap-5 lg:flex">
              <form onSubmit={submitSearch} className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-xl border border-[#DCE5DF] bg-white px-4 shadow-sm focus-within:border-[#08784D] focus-within:ring-2 focus-within:ring-[#08784D]/10">
                <Search size={17} className="shrink-0 text-[#7A8A82]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AA8A1]" placeholder="Search for make, model, or location..." aria-label="Search marketplace" />
              </form>
              <div className="flex items-center gap-3">
                <Link href={activeRole === "seller" ? "/dashboard/seller/notifications" : "/notifications"} aria-label="View notifications" className="relative rounded-full border border-[#DCE5DF] bg-white p-2.5 text-[#063F2C] hover:border-[#08784D]"><Bell size={17} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /></Link>
                <div className="relative">
                  <button type="button" onClick={() => setProfileMenuOpen((current) => !current)} aria-expanded={profileMenuOpen} aria-label="Open profile menu" className="flex items-center gap-2 rounded-full border border-[#DCE5DF] bg-white p-1.5 pr-3 shadow-sm hover:border-[#08784D]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B5D3B] text-xs font-black text-white">{initials || "G"}</span>
                    <span className="max-w-32 truncate text-sm font-bold text-[#17201D]">{displayName}</span>
                  </button>
                  {profileMenuOpen && <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-[#DCE5DF] bg-white p-2 shadow-xl">
                    <div className="border-b border-[#EEF2EF] px-3 py-2"><p className="text-sm font-bold text-[#17201D]">{displayName}</p><p className="mt-1 truncate text-xs text-gray-500">{profile?.email || "No email available"}</p></div>
                    <Link href="/dashboard/profile" onClick={() => setProfileMenuOpen(false)} className="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F2F7F4]">Profile</Link>
                    <Link href="/dashboard/settings" onClick={() => setProfileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F2F7F4]">Settings</Link>
                    <button type="button" onClick={() => void logout()} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Log out</button>
                  </div>}
                </div>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
