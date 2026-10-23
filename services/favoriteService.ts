"use client";

import { getActiveListings } from "@/services/listingService";
import { createNotification } from "@/services/notificationService";
import { db, firebaseReady } from "@/lib/firebase";
import type { Vehicle } from "@/Types/vehicle";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const STORAGE_KEY_PREFIX = "easy-ride:favorites:";

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readLocalFavoriteIds(userId: string): string[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(storageKey(userId));
  if (!raw) return [];

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeLocalFavoriteIds(userId: string, ids: string[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(storageKey(userId), JSON.stringify(ids));
}

function updateLocalListingFavoriteCount(listingId: string, delta: number) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem("easy-ride:listings");
    if (!raw) return;

    const listings = JSON.parse(raw) as Vehicle[];
    const next = listings.map((listing) =>
      listing.id === listingId
        ? { ...listing, favoritesCount: Math.max(0, (listing.favoritesCount ?? 0) + delta) }
        : listing,
    );

    window.localStorage.setItem("easy-ride:listings", JSON.stringify(next));
  } catch {
    // Ignore best-effort local count updates.
  }
}

async function notifyOwnerAboutFavorite(listing: Vehicle, userId: string) {
  if (listing.ownerId === userId) {
    return;
  }

  await createNotification({
    userId: listing.ownerId,
    type: "listing",
    title: "Your listing was saved",
    message: `${listing.make} ${listing.model} ${listing.year} was added to favorites.`,
    actionUrl: `/vehicle/${listing.id}`,
    link: `/vehicle/${listing.id}`,
  });
}

export async function addFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  if (!firebaseReady || !db) {
    const ids = readLocalFavoriteIds(userId);
    if (!ids.includes(listingId)) {
      writeLocalFavoriteIds(userId, [listingId, ...ids]);
      updateLocalListingFavoriteCount(listingId, 1);
    }

    const listings = await getActiveListings();
    const listing = listings.find((item) => item.id === listingId);
    if (listing) {
      await notifyOwnerAboutFavorite(listing, userId);
    }

    return;
  }

  const favoriteId = `${userId}_${listingId}`;
  await setDoc(doc(db, "favorites", favoriteId), {
    userId,
    listingId,
    createdAt: Timestamp.now(),
  });

  await updateDoc(doc(db, "listings", listingId), {
    favoritesCount: increment(1),
  });

  const listingSnapshot = await getDoc(doc(db, "listings", listingId));
  if (listingSnapshot.exists()) {
    const listing = {
      id: listingSnapshot.id,
      ...(listingSnapshot.data() as Omit<Vehicle, "id">),
    } as Vehicle;

    await notifyOwnerAboutFavorite(listing, userId);
  }
}

export async function removeFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  if (!firebaseReady || !db) {
    const ids = readLocalFavoriteIds(userId).filter((id) => id !== listingId);
    writeLocalFavoriteIds(userId, ids);
    updateLocalListingFavoriteCount(listingId, -1);
    return;
  }

  const favoriteId = `${userId}_${listingId}`;
  await deleteDoc(doc(db, "favorites", favoriteId));
  await updateDoc(doc(db, "listings", listingId), {
    favoritesCount: increment(-1),
  });
}

export async function isFavorite(
  userId: string,
  listingId: string,
): Promise<boolean> {
  if (!firebaseReady || !db) {
    return readLocalFavoriteIds(userId).includes(listingId);
  }

  const favoriteId = `${userId}_${listingId}`;
  const snapshot = await getDoc(doc(db, "favorites", favoriteId));

  return snapshot.exists();
}

export async function getUserFavoriteListings(
  userId: string,
): Promise<Vehicle[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const ids = readLocalFavoriteIds(userId);
    const listings = await getActiveListings();
    return listings.filter((listing) => ids.includes(listing.id));
  }

  const favoritesQuery = query(
    collection(firestore, "favorites"),
    where("userId", "==", userId),
  );

  const favoritesSnapshot = await getDocs(favoritesQuery);

  const listings = await Promise.all(
    favoritesSnapshot.docs.map(async (favoriteDocument) => {
      const listingId = favoriteDocument.data().listingId as string;
      const listingSnapshot = await getDoc(doc(firestore, "listings", listingId));

      if (!listingSnapshot.exists()) {
        return null;
      }

      return {
        id: listingSnapshot.id,
        ...listingSnapshot.data(),
      } as Vehicle;
    }),
  );

  return listings.filter(
    (listing): listing is Vehicle =>
      listing !== null && listing.status === "active",
  );
}
