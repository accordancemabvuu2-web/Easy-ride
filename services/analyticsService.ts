"use client";

import { db, firebaseReady } from "@/lib/firebase";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

type ListingEvent =
  | {
      listingId: string;
      userId: string | null;
      eventType: "view";
      createdAt: string;
    }
  | {
      listingId: string;
      sellerId: string;
      buyerId: string | null;
      eventType: "contact";
      contactMethod: "whatsapp" | "phone" | "message";
      createdAt: string;
    };

const STORAGE_KEY = "easy-ride:listing-events";

export interface SellerAnalytics {
  views: number;
  contacts: number;
  favorites: number;
  leadCount: number;
  conversionRate: number;
  favoriteRate: number;
  listings: Array<Partial<Vehicle> & { id: string }>;
}

function readLocalEvents(): ListingEvent[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ListingEvent[];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: ListingEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export async function recordListingView(
  listingId: string,
  userId?: string,
): Promise<void> {
  // Vehicle detail reads increment viewCount in the MongoDB API.
  void listingId;
  void userId;
}

export async function recordContactClick(
  listingId: string,
  sellerId: string,
  buyerId?: string,
  contactMethod: "whatsapp" | "phone" | "message" = "whatsapp",
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    writeLocalEvents([
      {
        listingId,
        sellerId,
        buyerId: buyerId ?? null,
        eventType: "contact",
        contactMethod,
        createdAt: new Date().toISOString(),
      },
      ...readLocalEvents(),
    ]);
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

export async function getSellerAnalytics(ownerId: string): Promise<SellerAnalytics> {
  const listings = await getMyListings();

  const views = listings.reduce(
    (total, listing) => total + Number(listing.views ?? 0),
    0,
  );
  const favorites = listings.reduce(
    (total, listing) => total + Number(listing.favoritesCount ?? 0),
    0,
  );

  let contacts = 0;
  if (firebaseReady && db) {
    const contactsSnapshot = await getDocs(
      query(
        collection(db, "listingEvents"),
        where("sellerId", "==", ownerId),
        where("eventType", "==", "contact"),
      ),
    );
    contacts = contactsSnapshot.size;
  } else {
    contacts = readLocalEvents().filter(
      (event): event is Extract<ListingEvent, { eventType: "contact" }> =>
        event.eventType === "contact" && event.sellerId === ownerId,
    ).length;
  }

  const leadCount = contacts;

  return {
    views,
    contacts,
    favorites,
    leadCount,
    conversionRate: views > 0 ? (leadCount / views) * 100 : 0,
    favoriteRate: views > 0 ? (favorites / views) * 100 : 0,
    listings,
  };
}
