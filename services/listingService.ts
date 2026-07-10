"use client";

import { db, firebaseReady, storage } from "@/lib/firebase";
import type { Vehicle, ListingStatus } from "@/Types/vehicle";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { vehicles as seedVehicles } from "@/Data/vehicles";

const STORAGE_KEY = "easy-ride:listings";
const MAX_LOCAL_IMAGES = 2;
const MAX_LOCAL_LISTINGS = 25;

function nowIso() {
  return new Date().toISOString();
}

function isQuotaExceededError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function compactLocalListing(listing: Vehicle): Vehicle {
  const coverImage = listing.coverImage || listing.images?.[0] || "";
  const images = (listing.images?.length ? listing.images : [coverImage])
    .filter(Boolean)
    .slice(0, MAX_LOCAL_IMAGES);

  return {
    ...listing,
    images: images.length ? images : coverImage ? [coverImage] : [],
    coverImage: coverImage || images[0] || "",
  };
}

function readLocalListings(): Vehicle[] {
  if (typeof window === "undefined") return [...seedVehicles];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seedVehicles.map(compactLocalListing))
      );
    } catch {
      // If storage is already full, keep working from the in-memory seed data.
    }
    return [...seedVehicles];
  }

  try {
    const parsed = JSON.parse(raw) as Vehicle[];
    return parsed.map(compactLocalListing);
  } catch {
    return [...seedVehicles];
  }
}

function writeLocalListings(listings: Vehicle[]) {
  if (typeof window === "undefined") return;

  const compacted = listings
    .map(compactLocalListing)
    .slice(0, MAX_LOCAL_LISTINGS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }

    const trimmed = compacted.map((listing) => ({
      ...listing,
      images: listing.images.slice(0, 1),
    }));

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

function normalizeListing(listing: Vehicle): Vehicle {
  return {
    ...listing,
    id: String(listing.id),
    images: listing.images?.length ? listing.images : [listing.coverImage],
    coverImage: listing.coverImage || listing.images?.[0] || "",
    views: listing.views ?? 0,
    favoritesCount: listing.favoritesCount ?? 0,
    createdAt: listing.createdAt ?? nowIso(),
    updatedAt: listing.updatedAt ?? nowIso(),
  };
}

async function fetchRemoteListings(): Promise<Vehicle[]> {
  if (!db) return readLocalListings().map(normalizeListing);

  const activeSnapshot = await getDocs(
    query(collection(db, "listings"), where("status", "==", "active"))
  );

  return activeSnapshot.docs.map((snapshot) =>
    normalizeListing({
      id: snapshot.id,
      ...(snapshot.data() as Omit<Vehicle, "id">),
    })
  ).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
}

async function fetchAllOwnedListings(ownerId: string): Promise<Vehicle[]> {
  if (!db) {
    return readLocalListings()
      .map(normalizeListing)
      .filter((listing) => listing.ownerId === ownerId);
  }

  const ownedSnapshot = await getDocs(
    query(collection(db, "listings"), where("ownerId", "==", ownerId))
  );

  return ownedSnapshot.docs.map((snapshot) =>
    normalizeListing({
      id: snapshot.id,
      ...(snapshot.data() as Omit<Vehicle, "id">),
    })
  ).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
}

export async function getActiveListings(): Promise<Vehicle[]> {
  return fetchRemoteListings();
}

export async function getPendingListings(): Promise<Vehicle[]> {
  if (!db) {
    return readLocalListings()
      .map(normalizeListing)
      .filter((listing) => listing.status === "pending");
  }

  const pendingSnapshot = await getDocs(
    query(collection(db, "listings"), where("status", "==", "pending"))
  );

  return pendingSnapshot.docs.map((snapshot) =>
    normalizeListing({
      id: snapshot.id,
      ...(snapshot.data() as Omit<Vehicle, "id">),
    })
  ).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
}

export async function getMyListings(ownerId: string): Promise<Vehicle[]> {
  return fetchAllOwnedListings(ownerId);
}

export async function getListingById(id: string): Promise<Vehicle | null> {
  if (!db) {
    const listings = readLocalListings().map(normalizeListing);
    return listings.find((listing) => listing.id === id) ?? null;
  }

  const snapshot = await getDoc(doc(db, "listings", id));
  if (!snapshot.exists()) return null;

  return normalizeListing({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Vehicle, "id">),
  });
}

export async function createListing(
  listing: Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt">
): Promise<Vehicle> {
  const payload: Vehicle = normalizeListing({
    id: crypto.randomUUID(),
    ...listing,
    status: "pending",
    views: 0,
    favoritesCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  if (!db) {
    const listings = readLocalListings().map(normalizeListing);
    writeLocalListings([payload, ...listings]);
    return payload;
  }

  await setDoc(doc(db, "listings", payload.id), payload);
  return payload;
}

export async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
  rejectionReason?: string
) {
  if (!db) {
    const listings = readLocalListings().map(normalizeListing);
    const nextListings = listings.map((listing) =>
      listing.id === listingId
        ? {
            ...listing,
            status,
            rejectionReason,
            updatedAt: nowIso(),
          }
        : listing
    );
    writeLocalListings(nextListings);
    return;
  }

  await updateDoc(doc(db, "listings", listingId), {
    status,
    rejectionReason: rejectionReason ?? null,
    updatedAt: nowIso(),
  });
}

export async function deleteListing(listingId: string) {
  if (!db) {
    const listings = readLocalListings().filter((listing) => listing.id !== listingId);
    writeLocalListings(listings);
    return;
  }

  await deleteDoc(doc(db, "listings", listingId));
}

export async function uploadVehicleImages(userId: string, files: File[]) {
  if (!files.length) return [];

  const activeStorage = storage;

  if (!firebaseReady || !activeStorage) {
    const result = await Promise.all(
      files.map(async (file) => {
        const source = await createImagePreview(file);
        return source;
      })
    );

    return result.slice(0, MAX_LOCAL_IMAGES);
  }

  const urls = await Promise.all(
    files.map(async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(
        activeStorage,
        `vehicle-images/${userId}/${fileName}`
      );
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    })
  );

  return urls;
}

async function createImagePreview(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1280;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return await readFileAsDataUrl(file);
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.78);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(file);
  });
}
