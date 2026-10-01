"use client";

import { CarFront, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  ["Home", "/"],
  ["Marketplace", "/marketplace"],
  ["Map", "/map"],
  ["Sell/Rent", "/create-listing"],
  ["About", "/about"],
  ["Contact", "/support"],
];

function navigationTypes(pathname: string, href: string) {
  const currentIndex = links.findIndex(([, linkHref]) => pathname === linkHref || (linkHref !== "/" && pathname.startsWith(`${linkHref}/`)));
  const targetIndex = links.findIndex(([, linkHref]) => href === linkHref);
  return [targetIndex >= currentIndex ? "nav-forward" : "nav-back"];
}

export default function LandingNavbar({ transparentOnTop = true }: { transparentOnTop?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 24);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <header style={{ viewTransitionName: "site-header" }} className={`fixed inset-x-0 top-0 z-50 border-b text-white transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300 ${scrolled || !transparentOnTop ? "border-white/10 bg-[#06110f]/90 shadow-lg shadow-black/10 backdrop-blur-md" : "border-transparent bg-transparent"}`}>
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Easy Ride home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5D3B] text-white shadow-sm"><CarFront size={27} strokeWidth={2.5} /></span>
          <span className="text-[21px] font-bold tracking-tight text-white">Easy <span className="text-emerald-400">Ride</span></span>
        </Link>
        <nav className="hidden h-full items-center gap-8 lg:flex" aria-label="Main navigation">
          {links.map(([label, href]) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} prefetch transitionTypes={navigationTypes(pathname, href)} aria-current={active ? "page" : undefined} className={`flex h-full items-center border-b-2 px-1 text-sm font-medium transition hover:text-emerald-300 ${active ? "border-emerald-400 font-semibold text-emerald-300" : "border-transparent text-white/90"}`}>
              {label}
            </Link>;
          })}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Login</Link>
          <Link href="/register" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">Sign Up</Link>
        </div>
        <button type="button" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-lg border border-white/40 p-2 text-white lg:hidden">
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <nav className="absolute left-0 right-0 top-[72px] grid gap-1 border-b border-slate-200 bg-white p-4 shadow-lg lg:hidden" aria-label="Mobile navigation">
          {links.map(([label, href]) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} prefetch transitionTypes={navigationTypes(pathname, href)} aria-current={active ? "page" : undefined} onClick={() => setMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-semibold ${active ? "bg-emerald-50 text-[#0B5D3B]" : "text-slate-700 hover:bg-emerald-50"}`}>{label}</Link>;
          })}
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">Login</Link>
          <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white">Sign Up</Link>
        </nav>
      )}
    </header>
  );
}
