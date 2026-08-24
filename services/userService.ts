"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { UserRole } from "@/Types/user";
import { doc, updateDoc } from "firebase/firestore";

const AUTH_CACHE_KEY = "easy-ride:auth-profile";

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
      if (raw) {
        try {
          const profile = JSON.parse(raw) as { id: string; role: UserRole };
          if (profile.id === userId) {
            window.localStorage.setItem(
              AUTH_CACHE_KEY,
              JSON.stringify({ ...profile, role }),
            );
          }
        } catch {
          // Ignore local cache update failures.
        }
      }
    }

    return;
  }

  await updateDoc(doc(firestore, "users", userId), {
    role,
  });
}
