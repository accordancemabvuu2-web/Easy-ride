"use client";

import { createNotification } from "@/services/notificationService";
import { db, firebaseReady } from "@/lib/firebase";
import type { Conversation, EasyRideMessage } from "@/Types/message";
import type { Vehicle } from "@/Types/vehicle";
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const CONVERSATIONS_KEY = "easy-ride:conversations";
const MESSAGES_KEY = "easy-ride:messages";
const CONVERSATIONS_EVENT = "easy-ride-conversations-updated";
const MESSAGES_EVENT = "easy-ride-messages-updated";

function conversationId(
  listingId: string,
  buyerId: string,
  sellerId: string,
): string {
  return `${listingId}_${buyerId}_${sellerId}`;
}

function readLocalConversations(): Conversation[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function writeLocalConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  window.dispatchEvent(new Event(CONVERSATIONS_EVENT));
}

function readLocalMessages(): Record<string, EasyRideMessage[]> {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(MESSAGES_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, EasyRideMessage[]>;
  } catch {
    return {};
  }
}

function writeLocalMessages(messages: Record<string, EasyRideMessage[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  window.dispatchEvent(new Event(MESSAGES_EVENT));
}

function sortByMessageDate(conversations: Conversation[]) {
  return [...conversations].sort((left, right) =>
    String(right.lastMessageAt ?? "").localeCompare(String(left.lastMessageAt ?? ""))
  );
}

async function notifyRecipient(params: {
  recipientId: string;
  title: string;
  message: string;
  link: string;
}) {
  await createNotification({
    userId: params.recipientId,
    type: "new_message",
    title: params.title,
    message: params.message,
    link: params.link,
  });
}

async function persistConversationAndMessage(
  id: string,
  conversation: Conversation,
  message: EasyRideMessage,
) {
  const conversations = readLocalConversations();
  const nextConversation: Conversation = {
    ...conversation,
    lastMessage: message.body,
    lastMessageAt: message.createdAt,
    unreadBy: [message.senderId === conversation.buyerId ? conversation.sellerId : conversation.buyerId],
  };

  const nextConversations = conversations.some((item) => item.id === id)
    ? conversations.map((item) => (item.id === id ? nextConversation : item))
    : [nextConversation, ...conversations];

  const messages = readLocalMessages();
  const nextMessages = messages[id] ?? [];

  writeLocalMessages({
    ...messages,
    [id]: [...nextMessages, message],
  });
  writeLocalConversations(nextConversations);
}

export async function startConversation(
  listing: Vehicle,
  buyer: {
    id: string;
    name: string;
  },
  firstMessage: string,
): Promise<string> {
  const id = conversationId(listing.id, buyer.id, listing.ownerId);
  const now = Timestamp.now();
  const recipientId = listing.ownerId;
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const existing =
      readLocalConversations().find((conversation) => conversation.id === id) ??
      ({
        id,
        listingId: listing.id,
        listingTitle: `${listing.make} ${listing.model} ${listing.year}`,
        listingImage: listing.coverImage,
        buyerId: buyer.id,
        buyerName: buyer.name,
        sellerId: listing.ownerId,
        sellerName: listing.ownerName,
        participants: [buyer.id, listing.ownerId],
        lastMessage: firstMessage,
        lastMessageAt: new Date().toISOString(),
        unreadBy: [listing.ownerId],
      } satisfies Conversation);

    const message: EasyRideMessage = {
      id: crypto.randomUUID(),
      conversationId: id,
      senderId: buyer.id,
      senderName: buyer.name,
      body: firstMessage,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await persistConversationAndMessage(id, existing, message);
    await notifyRecipient({
      recipientId,
      title: "New message",
      message: `${buyer.name} sent a message about ${listing.make} ${listing.model}.`,
      link: `/messages?conversation=${id}`,
    });

    return id;
  }

  const reference = doc(firestore, "conversations", id);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    await setDoc(reference, {
      listingId: listing.id,
      listingTitle: `${listing.make} ${listing.model} ${listing.year}`,
      listingImage: listing.coverImage,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: listing.ownerId,
      sellerName: listing.ownerName,
      participants: [buyer.id, listing.ownerId],
      lastMessage: firstMessage,
      lastMessageAt: now,
      unreadBy: [listing.ownerId],
    });
  }

    await addDoc(collection(firestore, "conversations", id, "messages"), {
    conversationId: id,
    senderId: buyer.id,
    senderName: buyer.name,
    body: firstMessage,
    createdAt: now,
    read: false,
  });

  await updateDoc(reference, {
    lastMessage: firstMessage,
    lastMessageAt: now,
    unreadBy: [listing.ownerId],
  });

  await notifyRecipient({
    recipientId,
    title: "New message",
    message: `${buyer.name} sent a message about ${listing.make} ${listing.model}.`,
    link: `/messages?conversation=${id}`,
  });

  return id;
}

export async function sendMessage(
  conversation: Conversation,
  sender: {
    id: string;
    name: string;
  },
  body: string,
): Promise<void> {
  const recipientId =
    sender.id === conversation.buyerId
      ? conversation.sellerId
      : conversation.buyerId;
  const now = Timestamp.now();
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const message: EasyRideMessage = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderId: sender.id,
      senderName: sender.name,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await persistConversationAndMessage(conversation.id, conversation, message);
    await notifyRecipient({
      recipientId,
      title: "New message",
      message: `${sender.name} sent a message about ${conversation.listingTitle}.`,
      link: `/messages?conversation=${conversation.id}`,
    });
    return;
  }

  await addDoc(collection(firestore, "conversations", conversation.id, "messages"), {
    conversationId: conversation.id,
    senderId: sender.id,
    senderName: sender.name,
    body,
    createdAt: now,
    read: false,
  });

  await updateDoc(doc(firestore, "conversations", conversation.id), {
    lastMessage: body,
    lastMessageAt: now,
    unreadBy: [recipientId],
  });

  await notifyRecipient({
    recipientId,
    title: "New message",
    message: `${sender.name} sent a message about ${conversation.listingTitle}.`,
    link: `/messages?conversation=${conversation.id}`,
  });
}

export function subscribeToMessages(
  conversationIdValue: string,
  callback: (messages: EasyRideMessage[]) => void,
): () => void {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const emit = () => {
      const messages = readLocalMessages()[conversationIdValue] ?? [];
      callback(
        [...messages].sort((left, right) =>
          String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""))
        ),
      );
    };

    emit();

    const listener = () => emit();
    window.addEventListener("storage", listener);
    window.addEventListener(MESSAGES_EVENT, listener);

    return () => {
      window.removeEventListener("storage", listener);
      window.removeEventListener(MESSAGES_EVENT, listener);
    };
  }

  const messagesQuery = query(
    collection(firestore, "conversations", conversationIdValue, "messages"),
    orderBy("createdAt", "asc"),
    limit(100),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    callback(
      snapshot.docs.map(
        (messageDocument: QueryDocumentSnapshot<DocumentData>) =>
          ({
            id: messageDocument.id,
            ...messageDocument.data(),
          }) as EasyRideMessage,
      ),
    );
  });
}

export async function getUserConversations(
  userId: string,
): Promise<Conversation[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return sortByMessageDate(
      readLocalConversations().filter((conversation) =>
        conversation.participants.includes(userId),
      ),
    );
  }

  const conversationsQuery = query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
  );

  const snapshot = await getDocs(conversationsQuery);

  return snapshot.docs.map(
    (conversationDocument) =>
      ({
        id: conversationDocument.id,
        ...conversationDocument.data(),
      }) as Conversation,
  );
}

export async function markConversationRead(
  conversationIdValue: string,
  userId: string,
): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const conversations = readLocalConversations();
    const next = conversations.map((conversation) =>
      conversation.id === conversationIdValue
        ? {
            ...conversation,
            unreadBy: conversation.unreadBy.filter((entry) => entry !== userId),
          }
        : conversation,
    );

    writeLocalConversations(next);
    return;
  }

  await updateDoc(doc(firestore, "conversations", conversationIdValue), {
    unreadBy: arrayRemove(userId),
  });
}
