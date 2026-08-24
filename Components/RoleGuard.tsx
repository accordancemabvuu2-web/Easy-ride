"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@/Types/user";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  label: string;
}

export default function RoleGuard({ children, allowedRoles, label }: RoleGuardProps) {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
        <section className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-red-600" size={48} />
          <h1 className="mt-5 text-3xl font-bold">{label} access required</h1>
          <p className="mt-3 leading-7 text-gray-500">
            Your account does not have permission to access this workspace.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
          >
            Return Home
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
