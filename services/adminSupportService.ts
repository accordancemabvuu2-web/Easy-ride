import { ApiError, api } from "@/lib/apiClient";
import type { SupportStatus } from "@/Types/support";

type UnknownRecord = Record<string, unknown>;

export interface AdminSupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: SupportStatus;
  createdAt: string | null;
  lastMessageAt: string | null;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string | null;
}

export interface AdminSupportPage {
  tickets: AdminSupportTicket[];
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
  throw new ApiError("The admin support API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function mapTicket(value: unknown): AdminSupportTicket {
  const record = asRecord(value);
  const ticketId = id(record);
  if (
    !ticketId ||
    typeof record.userId !== "string" ||
    typeof record.subject !== "string" ||
    typeof record.status !== "string"
  ) {
    return invalidResponse();
  }
  return {
    id: ticketId,
    userId: record.userId,
    subject: record.subject,
    category: typeof record.category === "string" ? record.category : "other",
    status: record.status as SupportStatus,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
    lastMessageAt: typeof record.lastMessageAt === "string" ? record.lastMessageAt : null,
  };
}

export async function getAdminSupportPage(
  page = 1,
  pageSize = 24,
  status: SupportStatus | "all" = "all",
): Promise<AdminSupportPage> {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("Support pagination is invalid.", "VALIDATION_ERROR", 400);
  }
  const params = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize) });
  const response = await api.get<unknown>("/admin/support?" + params.toString());
  const meta = asRecord(response.meta);
  if (
    !Array.isArray(response.data) ||
    !Number.isInteger(meta.total) ||
    (meta.total as number) < 0
  ) {
    return invalidResponse();
  }
  return {
    tickets: response.data.map(mapTicket),
    total: meta.total as number,
    page,
    pageSize,
  };
}

export async function getAdminSupportMessages(ticketId: string): Promise<SupportMessage[]> {
  const response = await api.get<unknown>(
    "/support/" + encodeURIComponent(ticketId) + "/messages?page=1&pageSize=100",
  );
  if (!Array.isArray(response.data)) return invalidResponse();
  return response.data.map((value) => {
    const record = asRecord(value);
    const messageId = id(record);
    if (!messageId || typeof record.senderId !== "string" || typeof record.body !== "string") {
      return invalidResponse();
    }
    return {
      id: messageId,
      senderId: record.senderId,
      body: record.body,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
    };
  }).reverse();
}

export async function sendAdminSupportReply(ticketId: string, body: string): Promise<void> {
  const message = body.trim();
  if (!message) throw new ApiError("Enter a reply.", "VALIDATION_ERROR", 400);
  await api.post("/support/" + encodeURIComponent(ticketId) + "/messages", { body: message });
}

export async function updateAdminSupportStatus(
  ticketId: string,
  status: Extract<SupportStatus, "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed">,
): Promise<void> {
  await api.patch("/admin/support/" + encodeURIComponent(ticketId) + "/status", { status });
}
