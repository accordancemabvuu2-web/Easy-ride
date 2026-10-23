"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { ReportReason, ListingReport } from "@/Types/report";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
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

export async function getListingReports(): Promise<ListingReport[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return readLocalReports();
  }

  const snapshot = await getDocs(collection(firestore, "reports"));
  return snapshot.docs.map(
    (reportDocument) =>
      ({
        id: reportDocument.id,
        ...reportDocument.data(),
      }) as ListingReport,
  );
}

export async function getReportsForListing(
  listingId: string,
): Promise<ListingReport[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return readLocalReports().filter((report) => report.listingId === listingId);
  }

  const snapshot = await getDocs(
    query(collection(firestore, "reports"), where("listingId", "==", listingId)),
  );

  return snapshot.docs.map(
    (reportDocument) =>
      ({
        id: reportDocument.id,
        ...reportDocument.data(),
      }) as ListingReport,
  );
}

export async function resolveListingReport(
  reportId: string,
  status: ListingReport["status"],
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    writeLocalReports(
      readLocalReports().map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
            }
          : report,
      ),
    );
    return;
  }

  await updateDoc(doc(firestore, "reports", reportId), {
    status,
  });
}
