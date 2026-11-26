import { ApiError, api } from "@/lib/apiClient";

type UnknownRecord = Record<string, unknown>;
export type AdminReportStatus = "open" | "investigating" | "resolved" | "dismissed";
export type AdminReportTarget = "vehicle" | "user" | "review" | "booking";

export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: AdminReportTarget;
  targetId: string;
  reason: string;
  description: string;
  status: AdminReportStatus;
  resolution: string | null;
  createdAt: string | null;
}

export interface AdminReportsPage {
  reports: AdminReport[];
  total: number;
  page: number;
  pageSize: number;
}

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

function invalidResponse(): never {
  throw new ApiError("The admin reports API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function mapReport(value: unknown): AdminReport {
  const record = asRecord(value);
  const idValue = id(record);
  const targets: Array<[AdminReportTarget, unknown]> = [
    ["vehicle", record.vehicleId],
    ["user", record.reportedUserId],
    ["review", record.reviewId],
    ["booking", record.bookingId],
  ];
  const target = targets.find(([, targetId]) => Boolean(targetId));
  const status = record.status;

  if (
    !idValue ||
    !target ||
    !["open", "investigating", "resolved", "dismissed"].includes(String(status)) ||
    typeof record.reporterId !== "string" ||
    typeof record.reason !== "string"
  ) {
    return invalidResponse();
  }

  return {
    id: idValue,
    reporterId: record.reporterId,
    targetType: target[0],
    targetId: id(target[1]) || String(target[1]),
    reason: record.reason,
    description: typeof record.description === "string" ? record.description : "",
    status: status as AdminReportStatus,
    resolution: typeof record.resolution === "string" ? record.resolution : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
  };
}

export async function getAdminReportsPage(
  page = 1,
  pageSize = 30,
  status: AdminReportStatus | "all" = "all",
): Promise<AdminReportsPage> {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("Report pagination is invalid.", "VALIDATION_ERROR", 400);
  }
  const params = new URLSearchParams({
    status,
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await api.get<unknown>("/admin/reports?" + params.toString());
  const meta = asRecord(response.meta);
  if (
    !Array.isArray(response.data) ||
    !Number.isInteger(meta.total) ||
    (meta.total as number) < 0
  ) {
    return invalidResponse();
  }
  return {
    reports: response.data.map(mapReport),
    total: meta.total as number,
    page,
    pageSize,
  };
}

export async function updateAdminReport(
  reportId: string,
  status: Exclude<AdminReportStatus, "open">,
  resolution?: string,
): Promise<void> {
  const cleanResolution = resolution?.trim();
  if (status === "resolved" && !cleanResolution) {
    throw new ApiError("A resolution is required to close a report.", "VALIDATION_ERROR", 400);
  }
  await api.patch("/admin/reports/" + encodeURIComponent(reportId), {
    status,
    ...(cleanResolution ? { resolution: cleanResolution } : {}),
  });
}
