"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { EasyRideNotification } from "@/Types/notification";

type UnknownRecord = Record<string, unknown>;

type CreateNotificationObjectInput = {
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  link?: string;
  icon?: string;
};

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
  throw new ApiError("The notifications API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function notificationUrl(resourceType: unknown): string {
  if (resourceType === "conversation") return "/messages";
  return "/notifications";
}

function mapNotification(value: unknown, userId: string): EasyRideNotification {
  const record = asRecord(value);
  const id = recordId(record);
  if (!id || typeof record.type !== "string" || typeof record.title !== "string" || typeof record.message !== "string") {
    return invalidResponse();
  }
  const actionUrl = notificationUrl(record.resourceType);
  return {
    id,
    userId,
    type: record.type,
    title: record.title,
    message: record.message,
    read: Boolean(record.readAt),
    actionUrl,
    link: actionUrl,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
  };
}

/** Notification creation is a backend side effect; browser code may not forge notification records. */
export async function createNotification(
  _input: CreateNotificationObjectInput | string,
  _title?: string,
  _message?: string,
  _type?: string,
  _actionUrl?: string,
  _icon?: string,
): Promise<void> {
  throw new ApiError(
    "Notifications can only be created by backend operations.",
    "FEATURE_UNAVAILABLE",
    501,
  );
}

export async function getUserNotifications(userId: string): Promise<EasyRideNotification[]> {
  const response = await api.get<unknown>("/notifications?page=1&pageSize=100");
  if (!Array.isArray(response.data)) return invalidResponse();
  return response.data.map((record) => mapNotification(record, userId));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await api.patch("/notifications/" + encodeURIComponent(notificationId) + "/read", {});
}

export async function markAllNotificationsRead(
  notificationsOrUserId: EasyRideNotification[] | string,
): Promise<void> {
  const notifications = typeof notificationsOrUserId === "string"
    ? await getUserNotifications(notificationsOrUserId)
    : notificationsOrUserId;
  const unread = notifications.filter((notification) => !notification.read);
  for (let index = 0; index < unread.length; index += 5) {
    await Promise.all(
      unread.slice(index, index + 5).map((notification) => markNotificationRead(notification.id)),
    );
  }
}

/** The backend currently stores notifications but does not expose a push or streaming transport. */
export function subscribeNotifications(
  userId: string,
  callback: (notifications: EasyRideNotification[]) => void,
  onError?: (message: string) => void,
): () => void {
  let active = true;
  const poll = async () => {
    try {
      const notifications = await getUserNotifications(userId);
      if (active) {
        callback(notifications);
        onError?.("");
      }
    } catch (error) {
      if (active) {
        onError?.(error instanceof Error ? error.message : "Notifications could not be loaded.");
      }
    }
  };
  void poll();
  const timer = window.setInterval(() => void poll(), 45_000);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

export const subscribeToNotifications = subscribeNotifications;


