"use client";

import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/services/notificationService";
import type { EasyRideNotification } from "@/Types/notification";
import { useEffect, useState } from "react";

export function useNotifications() {
  const { firebaseUser, profile } = useAuth();
  const userId = profile?.id ?? firebaseUser?.uid;
  const [notifications, setNotifications] = useState<EasyRideNotification[]>([]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && !window.localStorage.getItem("easy-ride:notifications")) {
      const samples: EasyRideNotification[] = [
        { id: "demo-notification-offer", userId, type: "offer", title: "New offer received on your Ford Ranger", message: "Tawanda Moyo submitted an offer of $37,000. Review it while it is fresh.", actionUrl: "/offers", link: "/offers", read: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: "demo-notification-message", userId, type: "message", title: "A buyer replied about your Toyota Axio", message: "Rudo would like to arrange a viewing this weekend.", actionUrl: "/messages", link: "/messages", read: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
        { id: "demo-notification-booking", userId, type: "booking", title: "Pickup tomorrow for your Honda Fit", message: "Tinashe’s rental starts tomorrow at 10:00 AM. Check the pickup checklist.", actionUrl: "/bookings", link: "/bookings", read: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
        { id: "demo-notification-listing", userId, type: "listing", title: "Your BMW 3 Series listing is live", message: "Your vehicle is now visible to buyers in Harare.", actionUrl: "/dashboard/seller/inventory", link: "/dashboard/seller/inventory", read: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      ];
      window.localStorage.setItem("easy-ride:notifications", JSON.stringify(samples));
    }
    return subscribeNotifications(userId, setNotifications);
  }, [userId]);

  return notifications;
}
