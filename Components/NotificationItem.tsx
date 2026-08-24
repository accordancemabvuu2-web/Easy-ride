"use client";

import type { EasyRideNotification } from "@/Types/notification";
import Link from "next/link";

export default function NotificationItem({
  notification,
}: {
  notification: EasyRideNotification;
}) {
  return (
    <Link
      href={notification.link ?? "#"}
      className={`block rounded-2xl border p-4 transition hover:shadow-sm ${
        notification.read
          ? "border-[#E5E7EB] bg-white"
          : "border-[#0B5D3B]/20 bg-[#0B5D3B]/6"
      }`}
    >
      <p className="font-semibold">{notification.title}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        {notification.message}
      </p>
    </Link>
  );
}
