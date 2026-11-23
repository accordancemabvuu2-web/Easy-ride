import AdminGuard from "@/Components/AdminGuard";
import AdminShell from "@/Components/admin/AdminShell";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
