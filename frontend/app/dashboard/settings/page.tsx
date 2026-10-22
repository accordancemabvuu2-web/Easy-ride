"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardSettingsPage() {
  return <RequireAuth><SettingsContent /></RequireAuth>;
}

function SettingsContent() {
  const { profile } = useAuth();
  const role = profile?.role === "buyer" ? "buyer" : "seller";

  return <DashboardShell role={role}><section className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C9A227]">Account</p><h1 className="mt-2 text-3xl font-black">Settings</h1><p className="mt-2 text-gray-500">Manage your Easy Ride preferences.</p><div className="mt-8 space-y-4 rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm"><label className="flex items-center justify-between gap-4 rounded-2xl bg-[#F5F7F6] p-4"><span><span className="block font-bold">Email notifications</span><span className="text-sm text-gray-500">Receive updates about offers and bookings.</span></span><input type="checkbox" defaultChecked className="h-5 w-5 accent-[#08784D]" /></label><label className="flex items-center justify-between gap-4 rounded-2xl bg-[#F5F7F6] p-4"><span><span className="block font-bold">Message alerts</span><span className="text-sm text-gray-500">Stay informed when a conversation changes.</span></span><input type="checkbox" defaultChecked className="h-5 w-5 accent-[#08784D]" /></label></div></section></DashboardShell>;
}
