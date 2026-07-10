"use client";

import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/Components/NotificationBell";
import {
  Bell,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

export default function Navbar() {
  const { profile, logout, loading } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = useMemo(
    () => [
      { label: "Buy", href: "/?type=buy" },
      { label: "Rent", href: "/?type=rent" },
      { label: "Map", href: "/map" },
      { label: "About", href: "/about" },
    ],
    []
  );

  const active = (href: string) =>
    href.startsWith("/?") ? pathname === "/" : pathname === href;

  const closeMenu = () => setMenuOpen(false);

  const authLinks = profile
    ? [
        { label: "Favorites", href: "/favorites", icon: Heart },
        { label: "Messages", href: "/messages", icon: MessageSquare },
        profile.role === "admin"
          ? { label: "Admin", href: "/admin", icon: Shield }
          : { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ]
    : [
        { label: "Login", href: "/login", icon: LogIn },
        { label: "Register", href: "/register", icon: UserPlus },
      ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B5D3B] font-bold text-white">
            ER
          </div>

          <div>
            <p className="text-xl font-bold text-[#0B5D3B]">Easy Ride</p>
            <p className="hidden text-xs text-gray-500 sm:block">
              Drive with confidence
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`font-medium transition ${
                active(link.href)
                  ? "text-[#0B5D3B]"
                  : "text-gray-700 hover:text-[#0B5D3B]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {authLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-2 font-medium text-gray-700 transition hover:text-[#0B5D3B]"
              >
                <Icon size={17} />
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/create-listing"
            className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-semibold text-white transition hover:bg-[#084B30]"
          >
            <Plus size={18} />
            Post Car
          </Link>

          {profile && <NotificationBell />}

          {!loading && profile && (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-5 py-3 font-medium text-gray-700 transition hover:border-[#0B5D3B] hover:text-[#0B5D3B]"
            >
              <LogOut size={17} />
              Logout
            </button>
          )}
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((current) => !current)}
          className="rounded-xl border border-[#E5E7EB] p-2 text-[#0B5D3B] md:hidden"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-[#E5E7EB] bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className={`rounded-xl px-4 py-3 font-medium transition ${
                  active(link.href)
                    ? "bg-[#F8F9FA] text-[#0B5D3B]"
                    : "text-gray-700 hover:bg-[#F8F9FA]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {authLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-gray-700 hover:bg-[#F8F9FA]"
                >
                  <Icon size={17} />
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/create-listing"
              onClick={closeMenu}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-4 py-3 font-semibold text-white"
            >
              <Plus size={18} />
              Post Car
            </Link>

            {profile && (
              <Link
                href="/notifications"
                onClick={closeMenu}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-3 font-medium text-gray-700"
              >
                <Bell size={17} />
                Alerts
              </Link>
            )}

            {!loading && profile && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  void logout();
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-3 font-medium text-gray-700"
              >
                <LogOut size={17} />
                Logout
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
