"use client";

import { useAuth } from "@/contexts/AuthContext";
import { markNotificationRead } from "@/services/notificationService";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BadgeDollarSign, CalendarDays, Car, CreditCard, ShieldCheck, Star, MessageCircle, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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

export default function NotificationBell() {
  const { profile } = useAuth();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const openNotification = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setOpen(false);
  };

  if (!profile) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 font-semibold text-gray-700 transition hover:border-[#0B5D3B] hover:text-[#0B5D3B]"
      >
        <Bell size={17} />
        Alerts
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 font-semibold text-gray-700 transition hover:border-[#0B5D3B] hover:text-[#0B5D3B]"
      >
        <Bell size={17} />
        Alerts
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1 text-[11px] font-bold text-[#121212]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[100] w-[360px] overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <h2 className="font-bold">Notifications</h2>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-[#0B5D3B]"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((notification) => {
                const Icon = iconMap[notification.type] ?? Bell;

                return (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl ?? notification.link ?? "/notifications"}
                    onClick={() => void openNotification(notification.id)}
                    className={`flex gap-3 border-b border-[#F0F1F2] px-5 py-4 ${
                      notification.read ? "bg-white" : "bg-[#0B5D3B]/5"
                    }`}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F8F9FA] text-[#0B5D3B]">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {notification.message}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
