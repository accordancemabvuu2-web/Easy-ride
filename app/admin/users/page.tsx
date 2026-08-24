"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAdminUsers } from "@/services/adminService";
import type { EasyRideUser } from "@/Types/user";
import { Loader2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<EasyRideUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | EasyRideUser["role"]>("all");

  useEffect(() => {
    void (async () => {
      try {
        setUsers(await getAdminUsers());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesQuery =
        !term ||
        [user.name, user.email, user.id, user.role].some((value) =>
          value.toLowerCase().includes(term),
        );
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:pl-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <Users className="text-[#0B5D3B]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Users</p>
            <h1 className="text-4xl font-bold">User management</h1>
          </div>
        </div>

        <div className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users by name, email, role, or ID"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">All roles</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="dealer">Dealer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="grid grid-cols-[2fr_1.2fr_1fr] gap-4 border-b border-[#E5E7EB] px-5 py-4 text-sm font-semibold text-gray-500">
              <div>User</div>
              <div>Email</div>
              <div>Role</div>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users found.</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-[2fr_1.2fr_1fr] gap-4 border-b border-[#F0F1F2] px-5 py-4 last:border-b-0">
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.id}</p>
                  </div>
                  <div className="truncate text-sm text-gray-600">{user.email}</div>
                  <div>
                    <AdminStatusBadge status={user.role} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
