"use client";

import { useAuth } from "@/contexts/AuthContext";
import { subscribeToUserConversations } from "@/services/messageService";
import { useEffect, useState } from "react";

export function useUnreadMessages() {
  const { firebaseUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser) {
      setCount(0);
      return;
    }

    return subscribeToUserConversations(firebaseUser.uid, (conversations) => {
      const unreadCount = conversations.filter((conversation) =>
        conversation.unreadBy?.includes(firebaseUser.uid),
      ).length;

      setCount(unreadCount);
    });
  }, [firebaseUser]);

  return count;
}
