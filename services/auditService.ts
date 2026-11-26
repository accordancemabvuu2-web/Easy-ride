"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { AuditLog } from "@/Types/audit";

type UnknownRecord = Record<string, unknown>;

export interface AuditLogPage {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

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
  throw new ApiError("The audit API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function mapAuditLog(value: unknown): AuditLog {
  const record = asRecord(value);
  const id = recordId(record);
  const actorId = recordId(record.actorId);
  const action = record.action;
  const targetType = record.resourceType;
  const targetId = typeof record.resourceId === "string" ? record.resourceId : "";
  const timestamp = record.timestamp;

  if (
    !id ||
    !actorId ||
    typeof action !== "string" ||
    typeof targetType !== "string" ||
    typeof timestamp !== "string"
  ) {
    return invalidResponse();
  }

  return {
    id,
    actorId,
    actorName: "Actor " + actorId.slice(-6),
    actorRole: "Not included in the audit record",
    action,
    targetType,
    targetId,
    description: [action, targetType, targetId].filter(Boolean).join(" · "),
    createdAt: timestamp,
  };
}

/** Audit entries are created only by backend operations that also perform the audited action. */
export async function createAuditLog(_input: unknown): Promise<void> {
  throw new ApiError(
    "Audit entries can only be created by audited backend operations.",
    "FEATURE_UNAVAILABLE",
    501,
  );
}

export async function getAuditLogs(page = 1, pageSize = 30): Promise<AuditLogPage> {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("Audit pagination is invalid.", "VALIDATION_ERROR", 400);
  }

  const response = await api.get<unknown>(
    "/admin/audit-logs?" + new URLSearchParams({ page: String(page), pageSize: String(pageSize) }),
  );
  const meta = asRecord(response.meta);
  if (
    !Array.isArray(response.data) ||
    !Number.isInteger(meta.total) ||
    (meta.total as number) < 0
  ) {
    return invalidResponse();
  }

  return {
    logs: response.data.map(mapAuditLog),
    total: meta.total as number,
    page,
    pageSize,
  };
}

