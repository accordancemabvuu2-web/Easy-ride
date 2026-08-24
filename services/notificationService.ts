"use client";

import { auth, db, firebaseReady } from "@/lib/firebase";
import type { EasyRideNotification, NotificationType } from "@/Types/notification";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  onSnapshot,
} from "firebase/firestore";

const STORAGE_KEY = "easy-ride:notifications";
const UPDATE_EVENT = "easy-ride-notifications-updated";

type CreateNotificationObjectInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  link?: string;
  icon?: string;
};

function readLocalNotifications(): EasyRideNotification[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as EasyRideNotification[];
  } catch {
    return [];
  }
}

function writeLocalNotifications(notifications: EasyRideNotification[]): EasyRideNotification[] {
  if (typeof window === "undefined") return notifications;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(UPDATE_EVENT));

  return notifications;
}

function sortNotifications(notifications: EasyRideNotification[]) {
  return [...notifications].sort((left, right) =>
    String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
  );
}

function normalizeNotification(notification: EasyRideNotification): EasyRideNotification {
  return {
    ...notification,
    actionUrl: notification.actionUrl ?? notification.link,
    link: notification.link ?? notification.actionUrl,
    icon: notification.icon ?? "",
    read: Boolean(notification.read),
  };
}

function mapNotificationInput(input: CreateNotificationObjectInput): EasyRideNotification {
  return normalizeNotification({
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    actionUrl: input.actionUrl ?? input.link,
    link: input.link ?? input.actionUrl,
    icon: input.icon ?? "",
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function createNotification(
  input: CreateNotificationObjectInput,
): Promise<void>;
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  actionUrl?: string,
  icon?: string,
): Promise<void>;
export async function createNotification(
  arg1: CreateNotificationObjectInput | string,
  title?: string,
  message?: string,
  type?: NotificationType,
  actionUrl?: string,
  icon?: string,
): Promise<void> {
  const firestore = db;
  const input =
    typeof arg1 === "string"
      ? {
          userId: arg1,
          title: title ?? "",
          message: message ?? "",
          type: type ?? "announcement",
          actionUrl,
          link: actionUrl,
          icon,
        }
      : arg1;

  const payload = mapNotificationInput(input);

  if (!firebaseReady || !firestore) {
    const notifications = readLocalNotifications();
    writeLocalNotifications([payload, ...notifications]);
    return;
  }

  await addDoc(collection(firestore, "notifications"), {
    ...payload,
    createdBy: auth?.currentUser?.uid,
    createdAt: Timestamp.now(),
  });
}

export async function getUserNotifications(userId: string): Promise<EasyRideNotification[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return sortNotifications(
      readLocalNotifications()
        .filter((notification) => notification.userId === userId)
        .map(normalizeNotification),
    );
  }

  const snapshot = await getDocs(
    query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
  );

  return snapshot.docs.map(
    (notificationDocument) =>
      normalizeNotification({
        id: notificationDocument.id,
        ...(notificationDocument.data() as Omit<EasyRideNotification, "id">),
      }),
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const notifications = readLocalNotifications();
    writeLocalNotifications(
      notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );
    return;
  }

  await updateDoc(doc(firestore, "notifications", notificationId), {
    read: true,
  });
}

export async function markAllNotificationsRead(
  notificationsOrUserId: EasyRideNotification[] | string,
): Promise<void> {
  const notifications =
    typeof notificationsOrUserId === "string"
      ? await getUserNotifications(notificationsOrUserId)
      : notificationsOrUserId;

  await Promise.all(
    notifications
      .filter((notification) => !notification.read)
      .map((notification) => markNotificationRead(notification.id)),
  );
}

export function subscribeNotifications(
  userId: string,
  callback: (notifications: EasyRideNotification[]) => void,
): () => void {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const emit = () => {
      callback(
        sortNotifications(
          readLocalNotifications()
            .filter((notification) => notification.userId === userId)
            .map(normalizeNotification),
        ),
      );
    };

    emit();

    const listener = () => emit();
    window.addEventListener("storage", listener);
    window.addEventListener(UPDATE_EVENT, listener);

    return () => {
      window.removeEventListener("storage", listener);
      window.removeEventListener(UPDATE_EVENT, listener);
    };
  }

  const notificationsQuery = query(
    collection(firestore, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(100),
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    callback(
      snapshot.docs.map(
        (notificationDocument) =>
          normalizeNotification({
            id: notificationDocument.id,
            ...(notificationDocument.data() as Omit<EasyRideNotification, "id">),
          }),
      ),
    );
  });
}

export const subscribeToNotifications = subscribeNotifications;
