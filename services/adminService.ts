"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { EasyRideNotification } from "@/Types/notification";
import type { EasyRideUser } from "@/Types/user";
import type { Vehicle } from "@/Types/vehicle";
import { collection, getDocs } from "firebase/firestore";

const USERS_CACHE_KEY = "easy-ride:auth-profile";
const BOOKINGS_CACHE_KEY = "easy-ride:bookings";
const OFFERS_CACHE_KEY = "easy-ride:offers";
const PAYMENTS_CACHE_KEY = "easy-ride:payments";
const SUPPORT_CACHE_KEY = "easy-ride:support-tickets";
const REPORTS_CACHE_KEY = "easy-ride:reports";
const VERIFICATION_CACHE_KEY = "easy-ride:verification-requests";
const AUDIT_CACHE_KEY = "easy-ride:audit-logs";

function readLocalRecords<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function getAdminUsers(): Promise<EasyRideUser[]> {
  if (!firebaseReady || !db) {
    const cached = readLocalRecords<EasyRideUser>(USERS_CACHE_KEY);
    return cached.length ? cached : [];
  }

  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((userDocument) => ({
    id: userDocument.id,
    ...(userDocument.data() as Omit<EasyRideUser, "id">),
  }));
}

export async function getAdminListings(): Promise<Vehicle[]> {
  if (!firebaseReady || !db) {
    return readLocalRecords<Vehicle>("easy-ride:listings");
  }

  const snapshot = await getDocs(collection(db, "listings"));
  return snapshot.docs.map((listingDocument) => ({
    id: listingDocument.id,
    ...(listingDocument.data() as Omit<Vehicle, "id">),
  }));
}

export async function getAdminNotifications(): Promise<EasyRideNotification[]> {
  if (!firebaseReady || !db) {
    return readLocalRecords<EasyRideNotification>("easy-ride:notifications");
  }

  const snapshot = await getDocs(collection(db, "notifications"));
  return snapshot.docs.map((notificationDocument) => ({
    id: notificationDocument.id,
    ...(notificationDocument.data() as Omit<EasyRideNotification, "id">),
  }));
}

export async function getAdminSummary() {
  if (!firebaseReady || !db) {
    return {
      users: readLocalRecords<EasyRideUser>(USERS_CACHE_KEY).length,
      listings: readLocalRecords<Vehicle>("easy-ride:listings").length,
      bookings: readLocalRecords(BOOKINGS_CACHE_KEY).length,
      offers: readLocalRecords(OFFERS_CACHE_KEY).length,
      payments: readLocalRecords(PAYMENTS_CACHE_KEY).length,
      supportTickets: readLocalRecords(SUPPORT_CACHE_KEY).length,
      reports: readLocalRecords(REPORTS_CACHE_KEY).length,
      verificationRequests: readLocalRecords(VERIFICATION_CACHE_KEY).length,
      auditLogs: readLocalRecords(AUDIT_CACHE_KEY).length,
    };
  }

  const [users, listings, bookings, offers, payments, supportTickets, reports, verificationRequests, auditLogs] =
    await Promise.all([
      getAdminUsers(),
      getAdminListings(),
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "offers")),
      getDocs(collection(db, "payments")),
      getDocs(collection(db, "supportTickets")),
      getDocs(collection(db, "reports")),
      getDocs(collection(db, "verificationRequests")),
      getDocs(collection(db, "auditLogs")),
    ]);

  return {
    users: users.length,
    listings: listings.length,
    bookings: bookings.size,
    offers: offers.size,
    payments: payments.size,
    supportTickets: supportTickets.size,
    reports: reports.size,
    verificationRequests: verificationRequests.size,
    auditLogs: auditLogs.size,
  };
}
