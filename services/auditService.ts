"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { AuditAction, AuditLog } from "@/Types/audit";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";

interface CreateAuditLogInput {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  targetType: AuditLog["targetType"];
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "easy-ride:audit-logs";

function readLocalLogs(): AuditLog[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AuditLog[];
  } catch {
    return [];
  }
}

function writeLocalLogs(logs: AuditLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    writeLocalLogs([
      {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      },
      ...readLocalLogs(),
    ]);
    return;
  }

  await addDoc(collection(firestore, "auditLogs"), {
    ...input,
    createdAt: Timestamp.now(),
  });
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return readLocalLogs();
  }

  const auditQuery = query(
    collection(firestore, "auditLogs"),
    orderBy("createdAt", "desc"),
    limit(100),
  );

  const snapshot = await getDocs(auditQuery);

  return snapshot.docs.map(
    (auditDocument) =>
      ({
        id: auditDocument.id,
        ...auditDocument.data(),
      }) as AuditLog,
  );
}
