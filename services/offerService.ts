"use client";

import { db } from "@/lib/firebase";
import { createNotification } from "@/services/notificationService";
import type { OfferStatus, VehicleOffer } from "@/Types/offer";
import type { Vehicle } from "@/Types/vehicle";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  readRecords,
  removeRecord,
  upsertRecord,
  writeRecords,
  nowIso,
  generateId,
} from "@/utils/marketplaceStore";

const STORAGE_KEY = "easy-ride:offers";
const MAX_OFFERS = 200;

interface CreateOfferInput {
  vehicle: Vehicle;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  offeredPrice: number;
  message: string;
}

function readOffers() {
  return readRecords<VehicleOffer>(STORAGE_KEY);
}

function writeOffers(offers: VehicleOffer[]) {
  writeRecords(STORAGE_KEY, offers, MAX_OFFERS);
}

function normalizeTimestamp(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: number }).seconds === "number"
  ) {
    return new Date(
      ((value as { seconds: number }).seconds ?? 0) * 1000,
    ).toISOString();
  }

  return undefined;
}

function normalizeOffer(offer: VehicleOffer): VehicleOffer {
  const buyerMessage = offer.buyerMessage ?? offer.message ?? "";

  return {
    ...offer,
    buyerMessage,
    message: buyerMessage,
    buyerEmail: offer.buyerEmail ?? "",
    buyerPhone: offer.buyerPhone ?? "",
    sellerMessage: offer.sellerMessage ?? "",
    counterPrice: offer.counterPrice ?? undefined,
    createdAt: normalizeTimestamp(offer.createdAt) ?? nowIso(),
    updatedAt: normalizeTimestamp(offer.updatedAt) ?? nowIso(),
  };
}

function sortNewestFirst(left: VehicleOffer, right: VehicleOffer) {
  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

function getOffersForLocalUser(userId: string) {
  return readOffers()
    .map(normalizeOffer)
    .filter((offer) => offer.buyerId === userId || offer.sellerId === userId)
    .sort(sortNewestFirst);
}

async function getOffersForFirestoreUser(userId: string) {
  const [buyerSnapshot, sellerSnapshot] = await Promise.all([
    getDocs(
      query(collection(db!, "offers"), where("buyerId", "==", userId)),
    ),
    getDocs(
      query(collection(db!, "offers"), where("sellerId", "==", userId)),
    ),
  ]);

  const merged = [...buyerSnapshot.docs, ...sellerSnapshot.docs].map((snapshot) =>
    normalizeOffer({
      id: snapshot.id,
      ...(snapshot.data() as Omit<VehicleOffer, "id">),
    }),
  );

  return Array.from(new Map(merged.map((offer) => [offer.id, offer]))).map(([, offer]) => offer).sort(sortNewestFirst);
}

function localOffersFromListing(listingId: string, buyerId: string) {
  return readOffers()
    .map(normalizeOffer)
    .filter(
      (offer) =>
        offer.listingId === listingId &&
        offer.buyerId === buyerId &&
        ["pending", "countered", "accepted"].includes(offer.status),
    );
}

async function firestoreOffersFromListing(listingId: string, buyerId: string) {
  const snapshot = await getDocs(
    query(
      collection(db!, "offers"),
      where("listingId", "==", listingId),
      where("buyerId", "==", buyerId),
    ),
  );

  return snapshot.docs
    .map((offerDocument) =>
      normalizeOffer({
        id: offerDocument.id,
        ...(offerDocument.data() as Omit<VehicleOffer, "id">),
      }),
    )
    .filter((offer) => ["pending", "countered", "accepted"].includes(offer.status));
}

function ensureValidOfferAmount(amount: number, label = "offer") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Enter a valid ${label} amount.`);
  }
}

function ensureRole(offer: VehicleOffer, userId: string, role: "buyer" | "seller") {
  if (role === "buyer" && offer.buyerId !== userId) {
    throw new Error("Only the buyer can perform this action.");
  }

  if (role === "seller" && offer.sellerId !== userId) {
    throw new Error("Only the seller can perform this action.");
  }
}

function getLocalOffer(offerId: string) {
  const offer = readOffers().map(normalizeOffer).find((entry) => entry.id === offerId);

  if (!offer) {
    return null;
  }

  return offer;
}

function updateLocalOffer(
  offerId: string,
  updater: (offer: VehicleOffer) => VehicleOffer,
) {
  const offers = readOffers().map(normalizeOffer);
  const current = offers.find((offer) => offer.id === offerId);

  if (!current) {
    throw new Error("Offer not found.");
  }

  const nextOffer = normalizeOffer(updater(current));
  writeOffers(upsertRecord(removeRecord(offers, offerId), nextOffer));
  return nextOffer;
}

function updateLocalListingToSold(listingId: string, offerId: string, buyerId: string) {
  const listings = readRecords<Vehicle>("easy-ride:listings");
  if (!listings.find((listing) => listing.id === listingId)) {
    return;
  }

  const nextListings = listings.map((listing) =>
    listing.id === listingId
      ? {
          ...listing,
          status: "sold",
          soldToUserId: buyerId,
          completedOfferId: offerId,
          updatedAt: nowIso(),
        }
      : listing,
  );

  writeRecords("easy-ride:listings", nextListings, 200);
}

export async function createVehicleOffer(input: CreateOfferInput): Promise<string> {
  const { vehicle, buyer, offeredPrice, message } = input;

  if (vehicle.listingType !== "buy") {
    throw new Error("Offers can only be submitted for vehicles listed for sale.");
  }

  if (vehicle.status !== "active") {
    throw new Error("This vehicle is no longer available.");
  }

  if (buyer.id === vehicle.ownerId) {
    throw new Error("You cannot make an offer on your own vehicle.");
  }

  ensureValidOfferAmount(offeredPrice, "offer");

  if (db) {
    const existingOffers = await firestoreOffersFromListing(vehicle.id, buyer.id);

    if (existingOffers.length > 0) {
      throw new Error("You already have an active offer for this vehicle.");
    }

    const offerDocument = await addDoc(collection(db, "offers"), {
      listingId: vehicle.id,
      listingTitle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      listingImage: vehicle.coverImage,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      sellerId: vehicle.ownerId,
      sellerName: vehicle.ownerName,
      askingPrice: vehicle.price,
      offeredPrice,
      counterPrice: null,
      currency: vehicle.currency,
      buyerMessage: message.trim(),
      message: message.trim(),
      sellerMessage: "",
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await createNotification({
      userId: vehicle.ownerId,
      type: "offer",
      title: "New Offer",
      message: `${buyer.name} submitted an offer for ${vehicle.make} ${vehicle.model}.`,
      actionUrl: "/offers",
      link: "/offers",
    });

    return offerDocument.id;
  }

  const existingOffers = localOffersFromListing(vehicle.id, buyer.id);
  if (existingOffers.length > 0) {
    throw new Error("You already have an active offer for this vehicle.");
  }

  const offer: VehicleOffer = normalizeOffer({
    id: generateId(),
    listingId: vehicle.id,
    listingTitle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
    listingImage: vehicle.coverImage,
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    buyerPhone: buyer.phone,
    sellerId: vehicle.ownerId,
    sellerName: vehicle.ownerName,
    askingPrice: vehicle.price,
    offeredPrice,
    currency: vehicle.currency,
    buyerMessage: message.trim(),
    message: message.trim(),
    sellerMessage: "",
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  writeOffers(upsertRecord(readOffers(), offer));

  await createNotification({
    userId: vehicle.ownerId,
    type: "offer",
    title: "New Offer",
    message: `${buyer.name} submitted an offer for ${vehicle.make} ${vehicle.model}.`,
    actionUrl: "/offers",
    link: "/offers",
  });

  return offer.id;
}

export async function getOfferById(offerId: string): Promise<VehicleOffer | null> {
  if (!db) {
    return getLocalOffer(offerId);
  }

  const snapshot = await getDoc(doc(db, "offers", offerId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeOffer({
    id: snapshot.id,
    ...(snapshot.data() as Omit<VehicleOffer, "id">),
  });
}

export async function getUserOffers(userId: string): Promise<VehicleOffer[]> {
  if (!db) {
    return getOffersForLocalUser(userId);
  }

  return getOffersForFirestoreUser(userId);
}

export async function getAllOffers(): Promise<VehicleOffer[]> {
  if (!db) {
    return readOffers().map(normalizeOffer).sort(sortNewestFirst);
  }

  const snapshot = await getDocs(collection(db, "offers"));

  return snapshot.docs.map((offerDocument) =>
    normalizeOffer({
      id: offerDocument.id,
      ...(offerDocument.data() as Omit<VehicleOffer, "id">),
    }),
  );
}

async function updateOfferDocument(
  offerId: string,
  data: Partial<VehicleOffer>,
): Promise<void> {
  if (!db) {
    updateLocalOffer(offerId, (offer) => ({
      ...offer,
      ...data,
      updatedAt: nowIso(),
    }));
    return;
  }

  await updateDoc(doc(db, "offers", offerId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function acceptOffer(offer: VehicleOffer, currentUserId: string): Promise<void> {
  ensureRole(offer, currentUserId, "seller");

  if (offer.status !== "pending") {
    throw new Error("This offer can no longer be accepted.");
  }

  await updateOfferDocument(offer.id, { status: "accepted" });

  await createNotification({
    userId: offer.buyerId,
    type: "offer",
    title: "Offer Accepted",
    message: "The seller accepted your offer.",
    actionUrl: "/offers",
    link: "/offers",
  });
}

export async function rejectOffer(
  offer: VehicleOffer,
  currentUserId: string,
  message = "",
): Promise<void> {
  ensureRole(offer, currentUserId, "seller");

  if (!["pending", "countered"].includes(offer.status)) {
    throw new Error("This offer can no longer be rejected.");
  }

  await updateOfferDocument(offer.id, {
    status: "rejected",
    sellerMessage: message.trim(),
  });

  await createNotification({
    userId: offer.buyerId,
    type: "offer",
    title: "Offer Rejected",
    message: "Seller rejected your offer.",
    actionUrl: "/offers",
    link: "/offers",
  });
}

export async function counterOffer(
  offer: VehicleOffer,
  currentUserId: string,
  counterPrice: number,
  message: string,
): Promise<void> {
  ensureRole(offer, currentUserId, "seller");
  ensureValidOfferAmount(counterPrice, "counter-offer");

  if (offer.status !== "pending") {
    throw new Error("This offer can no longer be countered.");
  }

  await updateOfferDocument(offer.id, {
    status: "countered",
    counterPrice,
    sellerMessage: message.trim(),
  });

  await createNotification({
    userId: offer.buyerId,
    type: "offer",
    title: "Counter Offer",
    message: "Seller made a counter offer.",
    actionUrl: "/offers",
    link: "/offers",
  });
}

export async function acceptCounterOffer(offer: VehicleOffer, currentUserId: string): Promise<void> {
  ensureRole(offer, currentUserId, "buyer");

  if (offer.status !== "countered" || !offer.counterPrice) {
    throw new Error("There is no valid counter offer to accept.");
  }

  await updateOfferDocument(offer.id, { status: "accepted" });

  await createNotification({
    userId: offer.sellerId,
    type: "offer",
    title: "Counter Accepted",
    message: "The buyer accepted your counter offer.",
    actionUrl: "/offers",
    link: "/offers",
  });
}

export async function withdrawOffer(offer: VehicleOffer, currentUserId: string): Promise<void> {
  ensureRole(offer, currentUserId, "buyer");

  if (!["pending", "countered"].includes(offer.status)) {
    throw new Error("This offer can no longer be withdrawn.");
  }

  await updateOfferDocument(offer.id, { status: "withdrawn" });
}

export async function completeVehicleSale(offerId: string, currentUserId: string): Promise<void> {
  if (!db) {
    const offer = getLocalOffer(offerId);

    if (!offer) {
      throw new Error("Offer not found.");
    }

    ensureRole(offer, currentUserId, "seller");

    if (offer.status !== "accepted") {
      throw new Error("The offer must be accepted first.");
    }

    const nextOffer = updateLocalOffer(offerId, (entry) => ({
      ...entry,
      status: "completed",
    }));

    updateLocalListingToSold(nextOffer.listingId, nextOffer.id, nextOffer.buyerId);

    await createNotification({
      userId: nextOffer.buyerId,
      type: "offer",
      title: "Transaction Completed",
      message: "The vehicle sale has been completed.",
      actionUrl: "/offers",
      link: "/offers",
    });
    return;
  }

  const firestore = db;

  if (!firestore) {
    throw new Error("Firestore is not available.");
  }

  let buyerIdForNotification = currentUserId;

  await runTransaction(firestore, async (transaction) => {
    const offerReference = doc(firestore, "offers", offerId);
    const offerSnapshot = await transaction.get(offerReference);

    if (!offerSnapshot.exists()) {
      throw new Error("Offer not found.");
    }

    const offer = normalizeOffer({
      id: offerSnapshot.id,
      ...(offerSnapshot.data() as Omit<VehicleOffer, "id">),
    });

    buyerIdForNotification = offer.buyerId;

    ensureRole(offer, currentUserId, "seller");

    if (offer.status !== "accepted") {
      throw new Error("The offer must be accepted first.");
    }

    const listingReference = doc(firestore, "listings", offer.listingId);
    const listingSnapshot = await transaction.get(listingReference);

    if (!listingSnapshot.exists()) {
      throw new Error("The vehicle listing no longer exists.");
    }

    const listing = listingSnapshot.data() as Vehicle;

    if (listing.status !== "active") {
      throw new Error("The vehicle is no longer available.");
    }

    transaction.update(offerReference, {
      status: "completed",
      updatedAt: Timestamp.now(),
    });

    transaction.update(listingReference, {
      status: "sold",
      soldToUserId: offer.buyerId,
      completedOfferId: offer.id,
      updatedAt: Timestamp.now(),
    });
  });

  await createNotification({
    userId: buyerIdForNotification,
    type: "offer",
    title: "Transaction Completed",
    message: "The vehicle sale has been completed.",
    actionUrl: "/offers",
    link: "/offers",
  });
}

export async function updateOfferStatus(
  offerId: string,
  status: OfferStatus,
  data: Record<string, unknown> = {},
): Promise<void> {
  await updateOfferDocument(offerId, {
    status,
    ...(data as Partial<VehicleOffer>),
  });
}
