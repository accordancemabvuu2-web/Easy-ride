"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import {
  BadgeDollarSign,
  Bell,
  CalendarDays,
  Car,
  CheckCheck,
  CreditCard,
  Loader2,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const iconMap = {
  message: MessageCircle,
  new_message: MessageCircle,
  offer: BadgeDollarSign,
  booking: CalendarDays,
  payment: CreditCard,
  listing: Car,
  listing_approved: Car,
  listing_rejected: Car,
  listing_favorited: Car,
  listing_reported: Car,
  verification: ShieldCheck,
  review: Star,
  support: LifeBuoy,
  announcement: Bell,
} as const;

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const { profile } = useAuth();
  const notifications = useNotifications();
  const [loading, setLoading] = useState(false);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications],
  );

  const markAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsRead(unreadNotifications);
    } catch {
      toast.error("Notifications could not be updated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Notifications
              </p>
              <h1 className="text-4xl font-bold">Updates</h1>
            </div>
          </div>

          {unreadNotifications.length > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <CheckCheck size={17} />}
              Mark all read
            </button>
          )}
        </div>

        <p className="mt-3 text-gray-500">View updates from messages, offers, bookings, payments, and admin actions.</p>

        {notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <Bell className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No notifications yet</h2>
            <p className="mt-2 text-gray-500">Activity will appear here when something happens on the platform.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] ?? Bell;

              return (
                <Link
                  key={notification.id}
                  href={notification.actionUrl ?? notification.link ?? "#"}
                  onClick={() => void markNotificationRead(notification.id)}
                  className={`block rounded-3xl border p-5 transition hover:shadow-sm ${
                    notification.read
                      ? "border-[#E5E7EB] bg-white"
                      : "border-[#0B5D3B]/20 bg-[#0B5D3B]/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0B5D3B] shadow-sm">
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="font-bold">{notification.title}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{notification.message}</p>
                      </div>
                    </div>

                    {!notification.read && <span className="mt-1 h-3 w-3 rounded-full bg-[#0B5D3B]" />}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!profile && (
          <p className="mt-4 text-sm text-gray-500">
            Please log in to see your personalized notifications.
          </p>
        )}
      </section>
    </main>
  );
}
