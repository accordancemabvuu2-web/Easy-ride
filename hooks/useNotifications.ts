"use client";

import { useAuth } from "@/contexts/AuthContext";
import { subscribeNotifications } from "@/lib/clientFirebaseServices";
import type { EasyRideNotification } from "@/Types/notification";
import { useEffect, useState } from "react";

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<EasyRideNotification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      setError("");
      return;
    }

    setError("");
    return subscribeNotifications(profile.id, setNotifications, setError);
  }, [profile]);

  return { notifications, error };
}

