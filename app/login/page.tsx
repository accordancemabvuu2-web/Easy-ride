"use client";

import type { UserRole } from "@/Types/user";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { CarFront, ShieldCheck, Store, UserRound } from "lucide-react";
import { useState } from "react";

const roles: { role: UserRole; label: string; description: string; href: string; icon: typeof UserRound }[] = [
  { role: "buyer", label: "Buyer", description: "Browse vehicles, save favorites, and manage bookings.", href: "/dashboard/buyer", icon: UserRound },
  { role: "seller", label: "Seller", description: "Manage your vehicle listings and seller activity.", href: "/dashboard/seller", icon: Store },
  { role: "admin", label: "Admin", description: "Open the Easy Ride administration dashboard.", href: "/admin", icon: ShieldCheck },
];

export default function LoginPage() {
  const router = useRouter();
  const { continueWithLocalRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("buyer");

  const continueToDashboard = () => {
    const selected = roles.find(({ role }) => role === selectedRole) ?? roles[0];
    continueWithLocalRole(selected.role);
    router.replace(selected.href);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10 text-[#202124]">
      <section className="w-full max-w-xl rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B5D3B] text-white">
          <CarFront size={28} />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Choose your dashboard</h1>
        <p className="mt-2 text-gray-500">Select a local development role to continue.</p>

        <div className="mt-7 space-y-3">
          {roles.map(({ role, label, description, icon: Icon }) => (
            <label
              key={role}
              className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${selectedRole === role ? "border-[#0B5D3B] bg-[#0B5D3B]/5 ring-1 ring-[#0B5D3B]" : "border-[#E5E7EB] hover:border-[#0B5D3B]/40"}`}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={selectedRole === role}
                onChange={() => setSelectedRole(role)}
                className="sr-only"
              />
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5D3B] shadow-sm">
                <Icon size={21} />
              </span>
              <span>
                <span className="block font-bold">{label}</span>
                <span className="mt-1 block text-sm leading-6 text-gray-500">{description}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={continueToDashboard}
          className="mt-7 w-full rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white transition hover:bg-[#084B30]"
        >
          Continue to dashboard
        </button>
        <p className="mt-4 text-center text-xs text-gray-400">Local development access only</p>
      </section>
    </main>
  );
}
