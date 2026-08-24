"use client";

import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/services/notificationService";
import type { EasyRideNotification } from "@/Types/notification";
import { useEffect, useState } from "react";

export function useNotifications() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<EasyRideNotification[]>([]);

  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      return;
    }

    return subscribeNotifications(firebaseUser.uid, setNotifications);
  }, [firebaseUser]);

  return notifications;
}
