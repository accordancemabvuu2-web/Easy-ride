"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export function useUnreadMessages() {
  const { firebaseUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    if (!firebaseUser) {
      setCount(0);
      return () => {
        active = false;
      };
    }

    void import("@/services/messageService").then(({ subscribeToUserConversations }) => {
      if (!active) return;

      unsubscribe = subscribeToUserConversations(firebaseUser.uid, (conversations) => {
        const unreadCount = conversations.filter((conversation) =>
          conversation.unreadBy?.includes(firebaseUser.uid),
        ).length;

        setCount(unreadCount);
      });
    }).catch(() => {
      if (active) setCount(0);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [firebaseUser]);

  return count;
}
