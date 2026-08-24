"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Overview", href: "/dealer/dashboard" },
  { label: "Inventory", href: "/dealer/inventory" },
  { label: "Add Vehicle", href: "/create-listing" },
  { label: "Analytics", href: "/dealer/analytics" },
  { label: "Profile", href: "/dealer/profile" },
  { label: "Verification", href: "/verification" },
];

export default function DealerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-2xl px-4 py-3 font-medium ${
              pathname === link.href
                ? "bg-[#0B5D3B] text-white"
                : "text-gray-700 hover:bg-[#F8F9FA]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
