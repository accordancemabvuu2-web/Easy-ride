import AdminGuard from "@/Components/AdminGuard";
import AdminSidebar from "@/Components/AdminSidebar";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F4F7F3]">
        <AdminSidebar />
        <main className="min-h-screen w-full lg:pl-72">{children}</main>
      </div>
    </AdminGuard>
  );
}
