"use client";

import { useAuth } from "@/contexts/AuthContext";
import { subscribeToNotifications } from "@/services/notificationService";
import type { EasyRideNotification } from "@/Types/notification";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<EasyRideNotification[]>([]);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      return;
    }

    return subscribeToNotifications(profile.id, setNotifications);
  }, [profile]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

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
    <Link
      href="/notifications"
      className="relative inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 font-semibold text-gray-700 transition hover:border-[#0B5D3B] hover:text-[#0B5D3B]"
    >
      <Bell size={17} />
      Alerts
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1 text-[11px] font-bold text-[#121212]">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
