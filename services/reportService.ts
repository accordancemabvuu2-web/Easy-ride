"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { ReportReason, ListingReport } from "@/Types/report";
import {
  Timestamp,
  addDoc,
  collection,
} from "firebase/firestore";

interface CreateReportInput {
  listingId: string;
  listingTitle: string;
  reportedBy: string;
  reason: ReportReason;
  details: string;
}

const STORAGE_KEY = "easy-ride:reports";

function readLocalReports(): ListingReport[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ListingReport[];
  } catch {
    return [];
  }
}

function writeLocalReports(reports: ListingReport[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export async function createListingReport(
  input: CreateReportInput,
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const reports = readLocalReports();
    writeLocalReports([
      {
        id: crypto.randomUUID(),
        ...input,
        status: "open",
        createdAt: new Date().toISOString(),
      },
      ...reports,
    ]);
    return;
  }

  await addDoc(collection(firestore, "reports"), {
    ...input,
    status: "open",
    createdAt: Timestamp.now(),
  });
}
