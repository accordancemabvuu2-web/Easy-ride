"use client";

import AdminMetricCard from "@/Components/AdminMetricCard";
import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAdminListings, getAdminUsers } from "@/services/adminService";
import { getAllBookings } from "@/services/bookingService";
import { getAllPayments } from "@/services/paymentService";
import { getAllOffers } from "@/services/offerService";
import { getAuditLogs } from "@/services/auditService";
import { getListingReports } from "@/services/reportService";
import { getSupportTickets } from "@/services/supportService";
import { getVerificationRequests } from "@/services/verificationService";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    bookings: 0,
    offers: 0,
    payments: 0,
    supportTickets: 0,
    reports: 0,
    verificationRequests: 0,
    auditLogs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<
    {
      id: string;
      description: string;
      action: string;
      targetType: string;
      actorName: string;
    }[]
  >([]);

  useEffect(() => {
    void (async () => {
      const [
        users,
        listings,
        bookings,
        offers,
        payments,
        supportTickets,
        reports,
        verificationRequests,
        auditLogs,
      ] = await Promise.all([
        getAdminUsers(),
        getAdminListings(),
        getAllBookings(),
        getAllOffers(),
        getAllPayments(),
        getSupportTickets(),
        getListingReports(),
        getVerificationRequests(),
        getAuditLogs(),
      ]);

      setStats({
        users: users.length,
        listings: listings.length,
        bookings: bookings.length,
        offers: offers.length,
        payments: payments.length,
        supportTickets: supportTickets.length,
        reports: reports.length,
        verificationRequests: verificationRequests.length,
        auditLogs: auditLogs.length,
      });

      setRecentLogs(
        auditLogs
          .slice(0, 5)
          .map((log) => ({
            id: log.id,
            description: log.description,
            action: log.action,
            targetType: log.targetType,
            actorName: log.actorName,
          })),
      );
    })();
  }, []);

  const quickActions = useMemo(
    () => [
      { href: "/admin/listings", label: "Review listings", note: "Approve, suspend, or reject vehicles." },
      { href: "/admin/reports", label: "Handle reports", note: "Work through suspicious listings quickly." },
      { href: "/admin/verification", label: "Verify accounts", note: "Approve identity and dealer requests." },
      { href: "/admin/support", label: "Support inbox", note: "Respond to customer issues faster." },
    ],
    [],
  );

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:pl-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Admin Portal
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[#121212]">Operations overview</h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Monitor the marketplace from one place: users, listings, bookings, offers, payments,
            reports, support, verification, and audit activity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Users" value={stats.users} />
          <AdminMetricCard label="Listings" value={stats.listings} />
          <AdminMetricCard label="Bookings" value={stats.bookings} />
          <AdminMetricCard label="Offers" value={stats.offers} />
          <AdminMetricCard label="Payments" value={stats.payments} />
          <AdminMetricCard label="Support tickets" value={stats.supportTickets} />
          <AdminMetricCard label="Reports" value={stats.reports} />
          <AdminMetricCard label="Verification requests" value={stats.verificationRequests} />
          <AdminMetricCard label="Audit logs" value={stats.auditLogs} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#121212]">Jump into the right workflow</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-2xl border border-[#E5E7EB] p-4 transition hover:border-[#0B5D3B] hover:shadow-sm"
                >
                  <p className="font-semibold text-[#121212]">{action.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{action.note}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Recent activity
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#121212]">Latest admin events</h2>
            <div className="mt-5 space-y-3">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity yet.</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl bg-[#F8F9FA] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#121212]">{log.description}</p>
                      <AdminStatusBadge status={log.action} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {log.actorName} · {log.targetType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
