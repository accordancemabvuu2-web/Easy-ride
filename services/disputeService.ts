"use client";

import type { EasyRideDispute, DisputeStatus } from "@/Types/dispute";
import {
  generateId,
  nowIso,
  readRecords,
  upsertRecord,
  writeRecords,
} from "@/utils/marketplaceStore";

interface CreateDisputeInput {
  bookingId?: string;
  offerId?: string;
  paymentId?: string;
  listingId: string;
  openedById: string;
  openedByName: string;
  reason: string;
  details: string;
}

const STORAGE_KEY = "easy-ride:disputes";

function readDisputes() {
  return readRecords<EasyRideDispute>(STORAGE_KEY);
}

function writeDisputes(disputes: EasyRideDispute[]) {
  writeRecords(STORAGE_KEY, disputes, 100);
}

export function getAllDisputes() {
  return readDisputes().sort((left, right) =>
    (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
  );
}

export function getUserDisputes(userId: string) {
  return getAllDisputes().filter((dispute) => dispute.openedById === userId);
}

export function createDispute(input: CreateDisputeInput) {
  const dispute: EasyRideDispute = {
    id: generateId(),
    ...input,
    status: "open",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  writeDisputes(upsertRecord(readDisputes(), dispute));
  return dispute.id;
}

export function updateDisputeStatus(disputeId: string, status: DisputeStatus) {
  const disputes = readDisputes();
  const next = disputes.map((dispute) =>
    dispute.id === disputeId
      ? {
          ...dispute,
          status,
          updatedAt: nowIso(),
        }
      : dispute,
  );

  writeDisputes(next);
}
