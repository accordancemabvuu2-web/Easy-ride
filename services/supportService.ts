"use client";

import { db, firebaseReady } from "@/lib/firebase";
import { createNotification } from "@/services/notificationService";
import type { SupportStatus, SupportTicket } from "@/Types/support";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const STORAGE_KEY = "easy-ride:support-tickets";

function readLocalTickets(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

function writeLocalTickets(tickets: SupportTicket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export async function createSupportTicket(input: {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportTicket["category"];
  description: string;
  priority?: SupportTicket["priority"];
}): Promise<SupportTicket> {
  const payload: SupportTicket = {
    id: crypto.randomUUID(),
    ...input,
    status: "open",
    priority: input.priority ?? "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const firestore = db;
  if (!firebaseReady || !firestore) {
    writeLocalTickets([payload, ...readLocalTickets()]);
    return payload;
  }

  await addDoc(collection(firestore, "supportTickets"), {
    ...payload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return payload;
}

export async function getSupportTickets(userId?: string): Promise<SupportTicket[]> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    return userId
      ? readLocalTickets().filter((ticket) => ticket.userId === userId)
      : readLocalTickets();
  }

  const snapshots = await getDocs(collection(firestore, "supportTickets"));
  return snapshots.docs
    .map((ticketDocument) => ({
      id: ticketDocument.id,
      ...(ticketDocument.data() as Omit<SupportTicket, "id">),
    }))
    .filter((ticket) => (userId ? ticket.userId === userId : true));
}

export async function updateSupportTicket(
  ticketId: string,
  status: SupportStatus,
  adminResponse?: string,
  assignedTo?: string,
): Promise<void> {
  const firestore = db;
  if (!firebaseReady || !firestore) {
    const nextTickets = readLocalTickets().map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status,
              adminResponse: adminResponse ?? ticket.adminResponse,
              assignedTo: assignedTo ?? ticket.assignedTo,
              updatedAt: new Date().toISOString(),
            }
          : ticket,
      );

    writeLocalTickets(nextTickets);

    const updatedTicket = nextTickets.find((ticket) => ticket.id === ticketId);
    if (updatedTicket) {
      await createNotification({
        userId: updatedTicket.userId,
        type: "support",
        title: "Support ticket updated",
        message: `Your ticket "${updatedTicket.subject}" is now ${status}.`,
        actionUrl: "/support",
        link: "/support",
      });
    }

    return;
  }

  await updateDoc(doc(firestore, "supportTickets", ticketId), {
    status,
    adminResponse: adminResponse ?? null,
    assignedTo: assignedTo ?? null,
    updatedAt: Timestamp.now(),
  });

  const updatedTicket = (await getSupportTickets()).find((ticket) => ticket.id === ticketId);
  if (updatedTicket) {
    await createNotification({
      userId: updatedTicket.userId,
      type: "support",
      title: "Support ticket updated",
      message: `Your ticket "${updatedTicket.subject}" is now ${status}.`,
      actionUrl: "/support",
      link: "/support",
    });
  }
}
