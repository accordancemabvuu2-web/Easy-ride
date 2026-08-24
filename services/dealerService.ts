"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { Dealer, DealerStatus } from "@/Types/dealer";
import type { EasyRideUser } from "@/Types/user";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const STORAGE_KEY = "easy-ride:dealers";

function readLocalDealers(): Dealer[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Dealer[];
  } catch {
    return [];
  }
}

function writeLocalDealers(dealers: Dealer[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dealers));
}

export async function createDealerProfile(
  owner: EasyRideUser,
  input: Omit<Dealer, "id" | "ownerId" | "status" | "verified" | "averageRating" | "reviewCount" | "activeListings" | "createdAt" | "updatedAt">,
): Promise<Dealer> {
  const payload: Dealer = {
    id: crypto.randomUUID(),
    ownerId: owner.id,
    ...input,
    status: "pending",
    verified: false,
    averageRating: 0,
    reviewCount: 0,
    activeListings: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const firestore = db;
  if (!firebaseReady || !firestore) {
    writeLocalDealers([payload, ...readLocalDealers()]);
    return payload;
  }

  await setDoc(doc(firestore, "dealers", payload.id), {
    ...payload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return payload;
}

export async function getDealerByOwner(ownerId: string): Promise<Dealer | null> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    return readLocalDealers().find((dealer) => dealer.ownerId === ownerId) ?? null;
  }

  const snapshot = await getDocs(
    query(collection(firestore, "dealers"), where("ownerId", "==", ownerId)),
  );

  const dealer = snapshot.docs[0];
  if (!dealer) return null;

  return {
    id: dealer.id,
    ...(dealer.data() as Omit<Dealer, "id">),
  };
}

export async function getDealers(status?: DealerStatus): Promise<Dealer[]> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    return status
      ? readLocalDealers().filter((dealer) => dealer.status === status)
      : readLocalDealers();
  }

  const snapshots = await getDocs(collection(firestore, "dealers"));
  return snapshots.docs
    .map((dealerDocument) => ({
      id: dealerDocument.id,
      ...(dealerDocument.data() as Omit<Dealer, "id">),
    }))
    .filter((dealer) => (status ? dealer.status === status : true));
}

export async function updateDealerStatus(
  dealerId: string,
  status: DealerStatus,
): Promise<void> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    writeLocalDealers(
      readLocalDealers().map((dealer) =>
        dealer.id === dealerId
          ? { ...dealer, status, verified: status === "verified", updatedAt: new Date().toISOString() }
          : dealer,
      ),
    );
    return;
  }

  await updateDoc(doc(firestore, "dealers", dealerId), {
    status,
    verified: status === "verified",
    updatedAt: Timestamp.now(),
  });
}

export async function getDealerInventoryCount(ownerId: string): Promise<number> {
  const dealer = await getDealerByOwner(ownerId);
  return dealer?.activeListings ?? 0;
}
