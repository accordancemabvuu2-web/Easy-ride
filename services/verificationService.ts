"use client";

import { ApiError, api } from "@/lib/apiClient";
import type {
  VerificationRequest,
  VerificationStatus,
  VerificationType,
} from "@/Types/verification";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function recordId(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const candidate = record._id ?? record.id;
  return typeof candidate === "string" ? candidate : "";
}

function invalidResponse(): never {
  throw new ApiError("The verification API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function mapRequest(value: unknown): VerificationRequest {
  const record = asRecord(value);
  const id = recordId(record);
  const userId = recordId(record.userId);
  const type = record.type;
  const status = record.status;
  if (
    !id ||
    !["identity", "vehicle_ownership", "vehicle_history"].includes(String(type)) ||
    !["pending", "approved", "rejected", "unavailable"].includes(String(status))
  ) {
    return invalidResponse();
  }

  return {
    id,
    userId,
    type: type as VerificationType,
    status: status as VerificationStatus,
    vehicleId: recordId(record.vehicleId) || undefined,
    notes: typeof record.note === "string" ? record.note : undefined,
    rejectionReason: typeof record.reviewReason === "string" ? record.reviewReason : undefined,
    submittedAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    reviewedAt: typeof record.reviewedAt === "string" ? record.reviewedAt : undefined,
  };
}

export async function submitVerificationRequest(input: {
  type: VerificationType;
  vehicleId?: string;
  notes?: string;
}): Promise<VerificationRequest> {
  if (input.type === "vehicle_ownership" && !input.vehicleId) {
    throw new ApiError("Choose one of your vehicles for ownership review.", "VALIDATION_ERROR", 400);
  }
  if (input.type === "identity" && input.vehicleId) {
    throw new ApiError("Identity requests cannot include a vehicle.", "VALIDATION_ERROR", 400);
  }

  const response = await api.post<unknown>("/verification", {
    type: input.type,
    ...(input.vehicleId ? { vehicleId: input.vehicleId } : {}),
    ...(input.notes?.trim() ? { note: input.notes.trim() } : {}),
  });
  return mapRequest(response.data);
}

export async function getVerificationRequests(
  status?: VerificationStatus,
): Promise<VerificationRequest[]> {
  const response = await api.get<unknown>("/verification/me?page=1&pageSize=100");
  if (!Array.isArray(response.data)) return invalidResponse();
  return response.data.map(mapRequest).filter((request) => status ? request.status === status : true);
}

export async function reviewVerificationRequest(
  requestId: string,
  status: VerificationStatus,
  _reviewerId?: string,
  _reviewerName?: string,
  rejectionReason?: string,
): Promise<void> {
  if (!["approved", "rejected", "unavailable"].includes(status)) {
    throw new ApiError("That verification status cannot be applied by a reviewer.", "VALIDATION_ERROR", 400);
  }
  await api.patch("/admin/verification-requests/" + encodeURIComponent(requestId), {
    status,
    ...(rejectionReason?.trim() ? { reason: rejectionReason.trim() } : {}),
  });
}

