"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { SupportCategory, SupportStatus, SupportTicket } from "@/Types/support";

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

function mapStatus(value: unknown): SupportStatus {
  if (["open", "in_progress", "waiting_for_user", "resolved", "closed"].includes(String(value))) {
    return value as SupportStatus;
  }
  throw new ApiError("The support API returned an invalid ticket status.", "INVALID_RESPONSE", 502);
}

function mapCategory(value: unknown): SupportCategory {
  if (["account", "listing", "booking", "payment", "safety", "other"].includes(String(value))) {
    return value as SupportCategory;
  }
  return "other";
}

function mapTicket(value: unknown, userId: string): SupportTicket {
  const record = asRecord(value);
  const id = recordId(record);
  if (!id || typeof record.subject !== "string") {
    throw new ApiError("The support API returned an invalid ticket.", "INVALID_RESPONSE", 502);
  }
  return {
    id,
    userId,
    userName: "You",
    userEmail: "",
    subject: record.subject,
    category: mapCategory(record.category),
    description: "",
    status: mapStatus(record.status),
    priority: "medium",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createSupportTicket(input: {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportCategory;
  description: string;
  priority?: SupportTicket["priority"];
}): Promise<SupportTicket> {
  const category = input.category === "listing" || input.category === "payment" || input.category === "account" || input.category === "safety"
    ? input.category
    : "other";
  const response = await api.post<unknown>("/support", {
    subject: input.subject.trim(),
    category,
    message: input.description.trim(),
  });
  const record = asRecord(response.data);
  const id = recordId(record);
  if (!id) {
    throw new ApiError("The support API did not return a ticket ID.", "INVALID_RESPONSE", 502);
  }

  return {
    id,
    userId: input.userId,
    userName: input.userName,
    userEmail: "",
    subject: input.subject.trim(),
    category,
    description: input.description.trim(),
    status: mapStatus(record.status),
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getSupportTickets(userId = ""): Promise<SupportTicket[]> {
  const response = await api.get<unknown>("/support?page=1&pageSize=100");
  if (!Array.isArray(response.data)) {
    throw new ApiError("The support API returned an invalid ticket list.", "INVALID_RESPONSE", 502);
  }
  return response.data.map((record) => mapTicket(record, userId));
}

export async function updateSupportTicket(
  _ticketId: string,
  _status: SupportStatus,
  _adminResponse?: string,
  _assignedTo?: string,
): Promise<void> {
  throw new ApiError(
    "Use the authenticated support conversation and administrator status APIs to update a ticket.",
    "FEATURE_UNAVAILABLE",
    501,
  );
}
