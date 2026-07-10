"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/services/notificationService";
import type { EasyRideNotification } from "@/Types/notification";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<EasyRideNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const unsubscribe = subscribeToNotifications(profile.id, setNotifications);
    void getUserNotifications(profile.id).finally(() => setLoading(false));

    return unsubscribe;
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;

    try {
      await markAllNotificationsRead(profile.id);
    } catch {
      toast.error("Notifications could not be updated.");
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

          {notifications.some((notification) => !notification.read) && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 text-sm font-semibold"
            >
              <CheckCheck size={17} />
              Mark all read
            </button>
          )}
        </div>

        <p className="mt-3 text-gray-500">
          View listing approvals, messages, favorites, and reports in one place.
        </p>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <Bell className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No notifications yet</h2>
            <p className="mt-2 text-gray-500">
              Activity will appear here when listings are approved, favorited, or messaged.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link ?? "#"}
                onClick={() => void markNotificationRead(notification.id)}
                className={`block rounded-3xl border p-5 transition hover:shadow-sm ${
                  notification.read
                    ? "border-[#E5E7EB] bg-white"
                    : "border-[#0B5D3B]/20 bg-[#0B5D3B]/6"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold">{notification.title}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {notification.message}
                    </p>
                  </div>

                  {!notification.read && (
                    <span className="mt-1 h-3 w-3 rounded-full bg-[#0B5D3B]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
