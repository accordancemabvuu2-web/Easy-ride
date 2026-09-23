"use client";

import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/Components/NotificationBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  BadgeDollarSign,
  Bell,
  CalendarDays,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export default function Navbar() {
  const { firebaseUser, profile, logout, loading } = useAuth();
  const unreadMessages = useUnreadMessages();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const dashboardHref = useMemo(() => {
    switch (profile?.role) {
      case "admin":
        return "/admin";
      case "dealer":
        return "/dealer/dashboard";
      case "seller":
        return "/dashboard/seller";
      case "buyer":
        return "/dashboard/buyer";
      default:
        return "/dashboard";
    }
  }, [profile?.role]);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const mainLinks = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Map", href: "/map" },
      { label: "Sell / Rent", href: "/create-listing" },
      { label: "About", href: "/about" },
    ],
    [],
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] w-full items-center justify-between gap-3 lg:gap-4">
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B5D3B] text-sm font-bold text-white shadow-sm">
              ER
            </div>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-xl font-bold text-[#0B5D3B]">
                Easy Ride
              </p>
              <p className="hidden text-xs text-gray-500 sm:block">
                Drive with confidence
              </p>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {mainLinks.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}

            {firebaseUser && (
              <>
                <NavLink href="/favorites">
                  <Heart size={17} />
                  Favorites
                </NavLink>

                <NavLink href="/messages">
                  <MessageCircle size={17} />
                  Messages
                  {unreadMessages > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </NavLink>
              </>
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex xl:hidden">
            {!loading && !firebaseUser && (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full px-4 py-3 font-semibold text-gray-700 transition hover:bg-[#F3F6F4] hover:text-[#0B5D3B]"
              >
                <LogIn size={18} />
                Log in
              </Link>
            )}

            {firebaseUser && <NotificationBell />}

            <Link
              href="/create-listing"
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[#0B5D3B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#084B30]"
            >
              <Plus size={18} />
              Post Car
            </Link>

            {firebaseUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2.5 text-left transition hover:border-[#0B5D3B]/40 hover:bg-[#F8F9FA]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B5D3B]/10 font-bold text-[#0B5D3B]">
                    {profile?.name?.charAt(0).toUpperCase() ?? "U"}
                  </div>

                  <ChevronDown size={17} className="text-gray-500" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-[58px] w-64 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
                    <div className="border-b border-[#E5E7EB] px-5 py-4">
                      <p className="font-bold">
                        {profile?.name ?? "Easy Ride User"}
                      </p>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {profile?.email}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        href={dashboardHref}
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <LayoutDashboard size={18} />
                        Dashboard
                      </Link>

                      <Link
                        href="/bookings"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <CalendarDays size={18} />
                        Bookings
                      </Link>

                      <Link
                        href="/offers"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <BadgeDollarSign size={18} />
                        Offers
                      </Link>

                      <Link
                        href="/verification"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <ShieldCheck size={18} />
                        Verification
                      </Link>

                      <Link
                        href="/support"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <MessageCircle size={18} />
                        Support
                      </Link>

                      <button
                        type="button"
                        onClick={async () => {
                          await logout();
                          closeMenus();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={18} />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="rounded-xl border border-[#E5E7EB] p-2.5 text-[#0B5D3B] xl:hidden"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            {!loading && !firebaseUser && (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-full px-4 py-3 font-semibold text-gray-700 transition hover:bg-[#F3F6F4] hover:text-[#0B5D3B]"
                >
                  <LogIn size={18} />
                  Log in
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-3 font-semibold text-[#0B5D3B] transition hover:bg-[#0B5D3B]/5"
                >
                  <UserPlus size={18} />
                  Register
                </Link>
              </>
            )}

            {firebaseUser && (
              <>
                <NotificationBell />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((current) => !current)}
                    className="flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-4 py-2.5 text-left transition hover:border-[#0B5D3B]/40 hover:bg-[#F8F9FA]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B5D3B]/10 font-bold text-[#0B5D3B]">
                      {profile?.name?.charAt(0).toUpperCase() ?? "U"}
                    </div>

                    <div className="max-w-[150px]">
                      <p className="truncate text-sm font-bold text-[#202124]">
                        {profile?.name ?? "Easy Ride User"}
                      </p>

                      <p className="truncate text-xs capitalize text-gray-500">
                        {profile?.role ?? "member"}
                      </p>
                    </div>

                    <ChevronDown size={17} className="text-gray-500" />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 top-[58px] w-64 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
                      <div className="border-b border-[#E5E7EB] px-5 py-4">
                        <p className="font-bold">
                          {profile?.name ?? "Easy Ride User"}
                        </p>

                        <p className="mt-1 truncate text-sm text-gray-500">
                          {profile?.email}
                        </p>
                      </div>

                    <div className="p-2">
                      <Link
                        href={dashboardHref}
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <LayoutDashboard size={18} />
                        Dashboard
                      </Link>

                      <Link
                        href="/bookings"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <CalendarDays size={18} />
                        Bookings
                      </Link>

                      <Link
                        href="/offers"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <BadgeDollarSign size={18} />
                        Offers
                      </Link>

                      <Link
                        href="/verification"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <ShieldCheck size={18} />
                        Verification
                      </Link>

                      <Link
                        href="/support"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                      >
                        <MessageCircle size={18} />
                        Support
                      </Link>

                      <button
                        type="button"
                        onClick={async () => {
                          await logout();
                            closeMenus();
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={18} />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Link
              href="/create-listing"
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#084B30]"
            >
              <Plus size={18} />
              Post Your Car
            </Link>
          </div>

          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="rounded-xl border border-[#E5E7EB] p-2.5 text-[#0B5D3B] lg:hidden"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#E5E7EB] bg-white xl:hidden">
          <nav className="max-h-[calc(100vh-4.75rem)] space-y-1 overflow-y-auto px-4 py-4 sm:px-6">
            {mainLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenus}
                className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
              >
                {link.label}
              </Link>
            ))}

            {firebaseUser && (
              <>
                <Link
                  href={dashboardHref}
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <LayoutDashboard size={17} />
                  Dashboard
                </Link>

                <Link
                  href="/bookings"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <CalendarDays size={17} />
                  Bookings
                </Link>

                <Link
                  href="/offers"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <BadgeDollarSign size={17} />
                  Offers
                </Link>

                <Link
                  href="/verification"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <ShieldCheck size={17} />
                  Verification
                </Link>

                <Link
                  href="/support"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <MessageCircle size={17} />
                  Support
                </Link>

                <Link
                  href="/favorites"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <Heart size={17} />
                  Favorites
                </Link>

                <Link
                  href="/messages"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <MessageCircle size={17} />
                  Messages
                  {unreadMessages > 0 && (
                    <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>

                <Link
                  href="/notifications"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <Bell size={17} />
                  Notifications
                </Link>
              </>
            )}

            {!loading && !firebaseUser && (
              <>
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <LogIn size={17} />
                  Log in
                </Link>

                <Link
                  href="/register"
                  onClick={closeMenus}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <UserPlus size={17} />
                  Register
                </Link>
              </>
            )}

            <Link
              href="/create-listing"
              onClick={closeMenus}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-4 py-3 font-semibold text-white"
            >
              <Plus size={18} />
              Post Car
            </Link>

            {firebaseUser && (
              <button
                type="button"
                onClick={async () => {
                  closeMenus();
                  await logout();
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-3 font-medium text-gray-700"
              >
                <LogOut size={17} />
                Log out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-[#F3F6F4] hover:text-[#0B5D3B]"
    >
      {children}
    </Link>
  );
}
