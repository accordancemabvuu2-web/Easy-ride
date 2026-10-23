"use client";

import DashboardShell from "@/Components/DashboardShell";
import { SellerRouteContext } from "@/Components/SellerRouteContext";
import type { ReactNode } from "react";

export default function SellerDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell role="seller">
      <SellerRouteContext.Provider value={true}>
        {children}
      </SellerRouteContext.Provider>
    </DashboardShell>
  );
}
