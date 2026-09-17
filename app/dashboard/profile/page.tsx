"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardProfilePage() {
  return <RequireAuth><ProfileContent /></RequireAuth>;
}

function ProfileContent() {
  const { profile } = useAuth();
  const role = profile?.role === "buyer" ? "buyer" : "seller";

  return <DashboardShell role={role}><section className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C9A227]">Account</p><h1 className="mt-2 text-3xl font-black">Your profile</h1><p className="mt-2 text-gray-500">Your Easy Ride account details.</p><div className="mt-8 space-y-4 rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm"><div><p className="text-sm text-gray-500">Name</p><p className="mt-1 font-bold">{profile?.name}</p></div><div><p className="text-sm text-gray-500">Email</p><p className="mt-1 font-bold">{profile?.email}</p></div><div><p className="text-sm text-gray-500">Account type</p><p className="mt-1 font-bold capitalize">{profile?.role}</p></div></div></section></DashboardShell>;
}
