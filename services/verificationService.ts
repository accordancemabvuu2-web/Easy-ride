"use client";

import { db, firebaseReady } from "@/lib/firebase";
import { createNotification } from "@/services/notificationService";
import type {
  VerificationRequest,
  VerificationStatus,
  VerificationType,
} from "@/Types/verification";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const STORAGE_KEY = "easy-ride:verification-requests";

function readLocalRequests(): VerificationRequest[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VerificationRequest[];
  } catch {
    return [];
  }
}

function writeLocalRequests(requests: VerificationRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export async function submitVerificationRequest(input: {
  userId: string;
  userName: string;
  userEmail: string;
  type: VerificationType;
  notes?: string;
  identityDocumentUrl?: string;
  businessDocumentUrl?: string;
  proofOfAddressUrl?: string;
}): Promise<VerificationRequest> {
  const payload: VerificationRequest = {
    id: crypto.randomUUID(),
    ...input,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  const firestore = db;
  if (!firebaseReady || !firestore) {
    writeLocalRequests([payload, ...readLocalRequests()]);
    return payload;
  }

  await addDoc(collection(firestore, "verificationRequests"), {
    ...payload,
    submittedAt: Timestamp.now(),
  });
  return payload;
}

export async function getVerificationRequests(
  status?: VerificationStatus,
): Promise<VerificationRequest[]> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    return status
      ? readLocalRequests().filter((request) => request.status === status)
      : readLocalRequests();
  }

  const snapshots = await getDocs(collection(firestore, "verificationRequests"));
  return snapshots.docs
    .map((requestDocument) => ({
      id: requestDocument.id,
      ...(requestDocument.data() as Omit<VerificationRequest, "id">),
    }))
    .filter((request) => (status ? request.status === status : true));
}

export async function reviewVerificationRequest(
  requestId: string,
  status: VerificationStatus,
  reviewerId: string,
  reviewerName: string,
  rejectionReason?: string,
): Promise<void> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    const nextRequests = readLocalRequests().map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              rejectionReason,
              reviewedAt: new Date().toISOString(),
              reviewedBy: reviewerName,
            }
          : request,
      );

    writeLocalRequests(nextRequests);

    const updatedRequest = nextRequests.find((request) => request.id === requestId);
    if (updatedRequest) {
      await createNotification({
        userId: updatedRequest.userId,
        type: "verification",
        title: status === "approved" ? "Verification Approved" : "Verification Rejected",
        message:
          status === "approved"
            ? "Your verification request was approved."
            : rejectionReason ?? "Your verification request was rejected.",
        actionUrl: "/verification",
        link: "/verification",
      });
    }

    return;
  }

  await updateDoc(doc(firestore, "verificationRequests", requestId), {
    status,
    rejectionReason: rejectionReason ?? null,
    reviewedBy: reviewerId,
    reviewedAt: Timestamp.now(),
  });

  const updatedRequest = (await getVerificationRequests()).find((request) => request.id === requestId);
  if (updatedRequest) {
    await createNotification({
      userId: updatedRequest.userId,
      type: "verification",
      title: status === "approved" ? "Verification Approved" : "Verification Rejected",
      message:
        status === "approved"
          ? "Your verification request was approved."
          : rejectionReason ?? "Your verification request was rejected.",
      actionUrl: "/verification",
      link: "/verification",
    });
  }
}
