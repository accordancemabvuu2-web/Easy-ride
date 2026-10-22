"use client";

import { BarChart3, CarFront, LayoutDashboard, Plus, UserRound, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/dealer/dashboard", icon: LayoutDashboard },
  { label: "Inventory", href: "/dealer/inventory", icon: CarFront },
  { label: "Add Vehicle", href: "/create-listing", icon: Plus },
  { label: "Analytics", href: "/dealer/analytics", icon: BarChart3 },
  { label: "Profile", href: "/dealer/profile", icon: UserRound },
  { label: "Verification", href: "/verification", icon: BadgeCheck },
];

export default function DealerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-fit rounded-xl border border-[#CEDBD0] bg-white p-4">
      <div className="mb-4 flex items-center gap-3 border-b border-[#EAF0E9] px-2 pb-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#0B5D3B] font-bold text-white">ER</span>
        <div><p className="font-bold text-[#17251E]">Easy Ride</p><p className="text-xs text-[#52665B]">Dealer workspace</p></div>
      </div>
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#52665B]">Workspace</p>
      <div className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
              pathname === link.href
                ? "bg-[#EAF0E9] text-[#063F2F]"
                : "text-[#52665B] hover:bg-[#F4F7F3] hover:text-[#17251E]"
            }`}
          >
            <link.icon size={17} />
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
