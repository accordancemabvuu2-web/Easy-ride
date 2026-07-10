"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type {
  EasyRideNotification,
  NotificationType,
} from "@/Types/notification";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  doc,
  onSnapshot,
} from "firebase/firestore";

const STORAGE_KEY = "easy-ride:notifications";
const UPDATE_EVENT = "easy-ride-notifications-updated";

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

function writeLocalNotifications(
  notifications: EasyRideNotification[],
): EasyRideNotification[] {
  if (typeof window === "undefined") return notifications;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(UPDATE_EVENT));

  return notifications;
}

function sortNotifications(notifications: EasyRideNotification[]) {
  return [...notifications].sort((left, right) =>
    String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
  );
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const notifications = readLocalNotifications();
    writeLocalNotifications([
      {
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...notifications,
    ]);
    return;
  }

  await addDoc(collection(firestore, "notifications"), {
    ...input,
    read: false,
    createdAt: Timestamp.now(),
  });
}

export async function getUserNotifications(
  userId: string,
): Promise<EasyRideNotification[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return sortNotifications(
      readLocalNotifications().filter((notification) => notification.userId === userId)
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
      ({
        id: notificationDocument.id,
        ...notificationDocument.data(),
      }) as EasyRideNotification,
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

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifications = await getUserNotifications(userId);
  await Promise.all(
    notifications
      .filter((notification) => !notification.read)
      .map((notification) => markNotificationRead(notification.id)),
  );
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: EasyRideNotification[]) => void,
): () => void {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const emit = () => {
      callback(
        sortNotifications(
          readLocalNotifications().filter((notification) => notification.userId === userId),
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
          ({
            id: notificationDocument.id,
            ...notificationDocument.data(),
          }) as EasyRideNotification,
      ),
    );
  });
}
