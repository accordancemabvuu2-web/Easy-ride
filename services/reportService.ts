"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { ReportReason, ListingReport } from "@/Types/report";

interface CreateReportInput {
  listingId: string;
  listingTitle: string;
  reportedBy: string;
  reason: ReportReason;
  details: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function id(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const candidate = record._id ?? record.id;
  return typeof candidate === "string" ? candidate : "";
}

function mapReport(value: unknown): ListingReport {
  const record = asRecord(value);
  const reportId = id(record);
  const vehicleId = id(record.vehicleId);
  if (!reportId || !vehicleId || typeof record.reporterId !== "string") {
    throw new ApiError("The reports API returned an invalid record.", "INVALID_RESPONSE", 502);
  }
  const status = record.status === "investigating" ? "reviewing"
    : record.status === "resolved" || record.status === "dismissed" ? record.status : "open";

  return {
    id: reportId,
    listingId: vehicleId,
    listingTitle: "Vehicle report",
    reportedBy: record.reporterId,
    reason: typeof record.reason === "string" ? record.reason as ReportReason : "other",
    details: typeof record.description === "string" ? record.description : "",
    status,
    createdAt: record.createdAt,
  };
}

export async function createListingReport(input: CreateReportInput): Promise<void> {
  await api.post("/reports", {
    vehicleId: input.listingId,
    reason: input.reason,
    description: input.details.trim(),
  });
}

export async function getListingReports(): Promise<ListingReport[]> {
  const response = await api.get<unknown>("/admin/reports?status=all&page=1&pageSize=100");
  if (!Array.isArray(response.data)) {
    throw new ApiError("The admin reports API returned an invalid response.", "INVALID_RESPONSE", 502);
  }
  return response.data.map(mapReport);
}

export async function getReportsForListing(listingId: string): Promise<ListingReport[]> {
  return (await getListingReports()).filter((report) => report.listingId === listingId);
}

export async function resolveListingReport(
  reportId: string,
  status: ListingReport["status"],
  resolution?: string,
): Promise<void> {
  if (status === "open") {
    throw new ApiError("Reports cannot be reopened from this screen.", "INVALID_STATE", 409);
  }
  const backendStatus = status === "reviewing" ? "investigating" : status;
  const cleanResolution = resolution?.trim();
  if (backendStatus === "resolved" && !cleanResolution) {
    throw new ApiError("A resolution is required when closing a report.", "VALIDATION_ERROR", 400);
  }
  await api.patch("/admin/reports/" + encodeURIComponent(reportId), {
    status: backendStatus,
    ...(cleanResolution ? { resolution: cleanResolution } : {}),
  });
}
