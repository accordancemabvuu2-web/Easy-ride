"use client";

import { db, firebaseReady } from "@/lib/firebase";
import {
  Timestamp,
  doc,
  increment,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export async function recordListingView(
  listingId: string,
  userId?: string,
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return;
  }

  const listingReference = doc(firestore, "listings", listingId);

  await updateDoc(listingReference, {
    views: increment(1),
  });

  const eventId = crypto.randomUUID();

  await setDoc(doc(firestore, "listingEvents", eventId), {
    listingId,
    userId: userId ?? null,
    eventType: "view",
    createdAt: Timestamp.now(),
  });
}

export async function recordContactClick(
  listingId: string,
  sellerId: string,
  buyerId?: string,
  contactMethod: "whatsapp" | "phone" | "message" = "whatsapp",
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return;
  }

  await setDoc(doc(firestore, "listingEvents", crypto.randomUUID()), {
    listingId,
    sellerId,
    buyerId: buyerId ?? null,
    eventType: "contact",
    contactMethod,
    createdAt: Timestamp.now(),
  });
}
