"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { Banknote, ShieldCheck } from "lucide-react";

export default function PromotePage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller">
        <DashboardShell role="seller">
          <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <Banknote size={23} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-3xl font-black">Paid promotion is unavailable</h1>
            <p className="mt-3 text-gray-600">
              Paid listing promotion is not connected to a payment provider. No plan can be purchased,
              and no listing will be marked as promoted from this page.
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              <span>No payment will be taken. Your existing listings remain unchanged.</span>
            </p>
          </section>
        </DashboardShell>
      </RoleGuard>
    </RequireAuth>
  );
}
