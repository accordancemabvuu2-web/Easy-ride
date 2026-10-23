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
import type { Vehicle } from "@/Types/vehicle";
import { ArrowUpRight, ClipboardCheck, FileWarning, Headphones, History, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AdminOverviewPage() {
  const [listings, setListings] = useState<Vehicle[]>([]);
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
        allListings,
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

      setListings(allListings);
      setStats({
        users: users.length,
        listings: allListings.length,
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

  const pendingListings = useMemo(
    () => listings.filter((listing) => listing.status === "pending"),
    [listings],
  );

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
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6814]">Workspace / Overview</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#17251E]">Operations overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52665B]">
            Keep marketplace operations moving with a clear view of activity and review queues.
          </p>
          </div>
          <span className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#CEDBD0] bg-white px-3 py-2 text-xs font-semibold text-[#52665B]"><span className="h-2 w-2 rounded-full bg-[#24764C]" /> Live overview</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Users" value={stats.users} />
          <AdminMetricCard label="Listings" value={stats.listings} />
          <AdminMetricCard label="Pending approvals" value={pendingListings.length} />
          <AdminMetricCard label="Bookings" value={stats.bookings} />
          <AdminMetricCard label="Offers" value={stats.offers} />
          <AdminMetricCard label="Payments" value={stats.payments} />
          <AdminMetricCard label="Support tickets" value={stats.supportTickets} />
          <AdminMetricCard label="Reports" value={stats.reports} />
          <AdminMetricCard label="Verification requests" value={stats.verificationRequests} />
          <AdminMetricCard label="Audit logs" value={stats.auditLogs} />
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#CEDBD0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CEDBD0] px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-[#17251E]">Cars waiting for approval</h2>
              <p className="mt-1 text-sm text-[#52665B]">Review submitted vehicles and move approvals forward.</p>
            </div>
            <Link href="/admin/listings" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-[#0B5D3B] hover:bg-[#EAF0E9]">
              Review all <ArrowUpRight size={16} />
            </Link>
          </div>

          {pendingListings.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#EAF0E9] text-[#0B5D3B]"><ClipboardCheck size={23} /></span>
              <p className="mt-4 text-lg font-bold text-[#17251E]">No cars pending approval</p>
              <p className="mt-1 max-w-md text-sm leading-6 text-[#52665B]">New vehicles submitted for approval will appear here with their owner, city, type and review action.</p>
              <Link href="/admin/listings" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0B5D3B] px-4 font-bold text-white hover:bg-[#084B30]">Open listings <ArrowUpRight size={16} /></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingListings.map((listing) => (
                <div
                  key={listing.id}
                  className="border-b border-[#EAF0E9] p-5 last:border-0"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[#17251E]">
                          {listing.make} {listing.model} {listing.year}
                        </h3>
                        <AdminStatusBadge status={listing.status} />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {listing.ownerName} • {listing.location.city} • {listing.listingType === "buy" ? "For sale" : "For rent"}
                      </p>
                    </div>

                    <Link
                      href="/admin/listings"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0B5D3B] px-4 font-bold text-white hover:bg-[#084B30]"
                    >
                      Review listing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-[#CEDBD0] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#17251E]">Marketplace queues</h2>
                <p className="mt-1 text-sm text-[#52665B]">Open the next action that needs attention.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-lg border border-[#CEDBD0] p-4 transition hover:border-[#0B5D3B] hover:bg-[#F4F7F3]"
                >
                  <p className="flex items-center justify-between gap-2 font-semibold text-[#17251E]">{action.label}<ArrowUpRight size={16} className="text-[#52665B]" /></p>
                  <p className="mt-1 text-sm text-[#52665B]">{action.note}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#CEDBD0] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#17251E]">Recent admin activity</h2><p className="mt-1 text-sm text-[#52665B]">Latest recorded actions.</p></div><Link href="/admin/audit-logs" aria-label="Open audit logs" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#0B5D3B] hover:bg-[#EAF0E9]"><ArrowUpRight size={18} /></Link></div>
            <div className="mt-5 space-y-3">
              {recentLogs.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg bg-[#F4F7F3] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#0B5D3B]"><History size={18} /></span><div><p className="text-sm font-semibold text-[#17251E]">No recent audit entries</p><p className="mt-1 text-sm text-[#52665B]">Recorded admin events will appear here.</p></div></div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="rounded-lg bg-[#F4F7F3] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#17251E]">{log.description}</p>
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
        <section className="mt-5 rounded-xl border border-[#CEDBD0] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-[#17251E]">Other review queues</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[{href:"/admin/reports",label:"Reports",icon:FileWarning},{href:"/admin/verification",label:"Verification",icon:ShieldCheck},{href:"/admin/disputes",label:"Disputes",icon:ClipboardCheck},{href:"/admin/support",label:"Support",icon:Headphones}].map(({href,label,icon:Icon})=><Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-lg border border-[#CEDBD0] px-4 font-semibold text-[#17251E] hover:border-[#0B5D3B] hover:bg-[#F4F7F3]"><Icon size={17} className="text-[#0B5D3B]" />{label}<ArrowUpRight size={15} className="ml-auto text-[#52665B]" /></Link>)}</div></section>
      </div>
    </section>
  );
}
