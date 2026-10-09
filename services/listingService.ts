"use client";

import { db, firebaseReady, storage } from "@/lib/firebase";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/browser";
import type { ListingStatus, ListingType, Vehicle } from "@/Types/vehicle";
import {
  DocumentSnapshot,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  QueryDocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { vehicles as seedVehicles } from "@/Data/vehicles";

const STORAGE_KEY = "easy-ride:listings";
const MAX_VEHICLE_IMAGES = 10;
const MAX_LOCAL_LISTINGS = 25;

function nowIso() {
  return new Date().toISOString();
}

export interface ListingPage {
  listings: Vehicle[];
  lastDocument: QueryDocumentSnapshot | SupabaseListingCursor | null;
  hasMore: boolean;
}

interface SupabaseListingCursor {
  source: "supabase";
  offset: number;
}

export interface ListingPageFilters {
  listingType?: ListingType | "all";
  location?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
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
    .slice(0, MAX_VEHICLE_IMAGES);

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

type SupabaseVehicleRow = {
  id: string;
  owner_id: string;
  listing_type: ListingType;
  status: ListingStatus;
  make: string;
  model: string;
  year: number;
  price: number | string;
  currency: string;
  transmission: Vehicle["transmission"];
  fuel_type: Vehicle["fuelType"];
  mileage: number;
  condition: Vehicle["condition"];
  body_type: string | null;
  color: string | null;
  description: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  views: number;
  favorites_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  profiles:
    | {
        full_name: string;
        phone: string | null;
        avatar_url: string | null;
        role: "buyer" | "seller" | "dealer" | "admin";
      }
    | null;
  vehicle_images: Array<{
    image_url: string;
    display_order: number;
  }>;
};

function mapSupabaseVehicle(row: SupabaseVehicleRow): Vehicle {
  const images = [...(row.vehicle_images ?? [])]
    .sort((left, right) => left.display_order - right.display_order)
    .map((image) => image.image_url)
    .filter(Boolean);
  const profile = row.profiles;
  const coverImage = images[0] ?? "";

  return normalizeListing({
    id: row.id,
    ownerId: row.owner_id,
    ownerName: profile?.full_name || "Easy Ride seller",
    ownerPhone: profile?.phone || "",
    ownerEmail: "",
    listingType: row.listing_type,
    status: row.status,
    make: row.make,
    model: row.model,
    year: row.year,
    price: Number(row.price),
    currency: row.currency,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    mileage: row.mileage,
    condition: row.condition,
    bodyType: row.body_type ?? undefined,
    color: row.color ?? undefined,
    description: row.description,
    location: {
      address: row.address ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
    },
    images,
    coverImage,
    sellerType:
      profile?.role === "dealer" ? "Dealer" : "Private Seller",
    verified: profile?.role === "dealer" || profile?.role === "admin",
    featured: row.featured,
    views: row.views,
    favoritesCount: row.favorites_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const supabaseVehicleSelect =
  "*, profiles!vehicles_owner_id_fkey(full_name,phone,avatar_url,role), vehicle_images(image_url,display_order)";

async function fetchSupabaseListings(
  filters: ListingPageFilters,
  offset = 0,
): Promise<{ listings: Vehicle[]; hasMore: boolean }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  let query = supabase
    .from("vehicles")
    .select(supabaseVehicleSelect)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);

  if (filters.listingType && filters.listingType !== "all") {
    query = query.eq("listing_type", filters.listingType);
  }
  if (filters.location && filters.location !== "all") {
    query = query.ilike("city", filters.location);
  }
  if (filters.make && filters.make !== "all") {
    query = query.ilike("make", filters.make);
  }
  if (filters.model && filters.model !== "all") {
    query = query.ilike("model", filters.model);
  }
  if (filters.bodyType && filters.bodyType !== "all") {
    query = query.ilike("body_type", filters.bodyType);
  }
  if (filters.transmission && filters.transmission !== "all") {
    query = query.eq("transmission", filters.transmission);
  }
  if (filters.fuelType && filters.fuelType !== "all") {
    query = query.eq("fuel_type", filters.fuelType);
  }
  if (filters.condition && filters.condition !== "all") {
    query = query.eq("condition", filters.condition);
  }
  if (filters.priceMin !== undefined) query = query.gte("price", filters.priceMin);
  if (filters.priceMax !== undefined) query = query.lte("price", filters.priceMax);
  if (filters.yearMin !== undefined) query = query.gte("year", filters.yearMin);
  if (filters.yearMax !== undefined) query = query.lte("year", filters.yearMax);
  if (filters.mileageMax !== undefined) {
    query = query.lte("mileage", filters.mileageMax);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load Supabase listings: ${error.message}`);

  const rows = (data ?? []) as SupabaseVehicleRow[];
  return {
    listings: rows.map(mapSupabaseVehicle),
    hasMore: rows.length === 20,
  };
}

async function fetchRemoteListings(): Promise<Vehicle[]> {
  if (isSupabaseConfigured()) {
    const result = await fetchSupabaseListings({});
    return result.listings;
  }

  if (!db) return readLocalListings().map(normalizeListing);

  const activeSnapshot = await getDocs(
    query(
      collection(db, "listings"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    )
  );

  return activeSnapshot.docs.map((snapshot) =>
    normalizeListing({
      id: snapshot.id,
      ...(snapshot.data() as Omit<Vehicle, "id">),
    })
  );
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
  );
}

export async function getActiveListings(): Promise<Vehicle[]> {
  return fetchRemoteListings();
}

export async function getActiveListingPage(
  filters: ListingPageFilters = {},
  lastDocument?: DocumentSnapshot | SupabaseListingCursor,
): Promise<ListingPage> {
  if (isSupabaseConfigured()) {
    const offset =
      lastDocument && "source" in lastDocument ? lastDocument.offset : 0;
    const result = await fetchSupabaseListings(filters, offset);
    return {
      listings: result.listings,
      lastDocument: result.listings.length
        ? { source: "supabase", offset: offset + result.listings.length }
        : null,
      hasMore: result.hasMore,
    };
  }

  if (!db) {
    const listings = readLocalListings()
      .map(normalizeListing)
      .filter((listing) => listing.status === "active")
      .filter((listing) => matchesListingFilters(listing, filters))
      .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));

    const firebaseLastDocument =
      lastDocument && !("source" in lastDocument) ? lastDocument : undefined;
    const startIndex = firebaseLastDocument
      ? listings.findIndex((listing) => listing.id === firebaseLastDocument.id) + 1
      : 0;
    const pageListings = listings.slice(startIndex, startIndex + 20);

    return {
      listings: pageListings,
      lastDocument:
        pageListings.length > 0
          ? ({ id: pageListings[pageListings.length - 1].id } as QueryDocumentSnapshot)
          : null,
      hasMore: startIndex + pageListings.length < listings.length,
    };
  }

  const constraints: QueryConstraint[] = [where("status", "==", "active")];
  const equalityFilters = [
    ["listingType", filters.listingType],
    ["location.city", filters.location],
    ["make", filters.make],
    ["model", filters.model],
    ["bodyType", filters.bodyType],
    ["transmission", filters.transmission],
    ["fuelType", filters.fuelType],
    ["condition", filters.condition],
  ] as const;

  equalityFilters.forEach(([field, value]) => {
    if (value && value !== "all") {
      constraints.push(where(field, "==", value));
    }
  });

  if (filters.priceMin !== undefined) constraints.push(where("price", ">=", filters.priceMin));
  if (filters.priceMax !== undefined) constraints.push(where("price", "<=", filters.priceMax));
  if (filters.yearMin !== undefined) constraints.push(where("year", ">=", filters.yearMin));
  if (filters.yearMax !== undefined) constraints.push(where("year", "<=", filters.yearMax));
  if (filters.mileageMax !== undefined) constraints.push(where("mileage", "<=", filters.mileageMax));
  constraints.push(orderBy("createdAt", "desc"));
  if (lastDocument) constraints.push(startAfter(lastDocument));
  constraints.push(limit(20));

  const listingQuery = query(collection(db, "listings"), ...constraints);

  const snapshot = await getDocs(listingQuery);

  return {
    listings: snapshot.docs.map((listingDocument) =>
      normalizeListing({
        id: listingDocument.id,
        ...(listingDocument.data() as Omit<Vehicle, "id">),
      })
    ),
    lastDocument: snapshot.docs[snapshot.docs.length - 1] ?? null,
    hasMore: snapshot.docs.length === 20,
  };
}

function matchesListingFilters(listing: Vehicle, filters: ListingPageFilters) {
  return (
    (!filters.listingType || filters.listingType === "all" || listing.listingType === filters.listingType)
    && (!filters.location || filters.location === "all" || listing.location.city.toLowerCase() === filters.location.toLowerCase())
    && (!filters.make || filters.make === "all" || listing.make.toLowerCase() === filters.make.toLowerCase())
    && (!filters.model || filters.model === "all" || listing.model.toLowerCase() === filters.model.toLowerCase())
    && (!filters.bodyType || filters.bodyType === "all" || listing.bodyType?.toLowerCase() === filters.bodyType.toLowerCase())
    && (!filters.transmission || filters.transmission === "all" || listing.transmission === filters.transmission)
    && (!filters.fuelType || filters.fuelType === "all" || listing.fuelType === filters.fuelType)
    && (!filters.condition || filters.condition === "all" || listing.condition === filters.condition)
    && (filters.priceMin === undefined || listing.price >= filters.priceMin)
    && (filters.priceMax === undefined || listing.price <= filters.priceMax)
    && (filters.yearMin === undefined || listing.year >= filters.yearMin)
    && (filters.yearMax === undefined || listing.year <= filters.yearMax)
    && (filters.mileageMax === undefined || listing.mileage <= filters.mileageMax)
  );
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
  );
}

export async function getMyListings(ownerId: string): Promise<Vehicle[]> {
  return fetchAllOwnedListings(ownerId);
}

export async function getListingById(id: string): Promise<Vehicle | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from("vehicles")
      .select(supabaseVehicleSelect)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Could not load vehicle: ${error.message}`);
    return data ? mapSupabaseVehicle(data as SupabaseVehicleRow) : null;
  }

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
      files.slice(0, MAX_VEHICLE_IMAGES).map(async (file) => {
        const source = await createImagePreview(file);
        return source;
      })
    );

    return result.slice(0, MAX_VEHICLE_IMAGES);
  }

  const urls = await Promise.all(
    files.slice(0, MAX_VEHICLE_IMAGES).map(async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const optimizedFile = await optimizeImage(file);
      const storageRef = ref(
        activeStorage,
        `vehicle-images/${userId}/${fileName}`
      );
      await uploadBytes(storageRef, optimizedFile, {
        cacheControl: "public,max-age=31536000,immutable",
        contentType: "image/jpeg",
      });
      return getDownloadURL(storageRef);
    })
  );

  return urls;
}

async function createImagePreview(file: File) {
  const optimizedFile = await optimizeImage(file);
  return await readBlobAsDataUrl(optimizedFile);
}

async function optimizeImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

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
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const optimized = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.78);
  });

  return optimized ?? file;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(blob);
  });
}
