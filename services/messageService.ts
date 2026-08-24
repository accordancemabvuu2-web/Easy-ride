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

function conversationId(listingId: string, buyerId: string, sellerId: string): string {
  return `${listingId}_${buyerId}_${sellerId}`;
}

function nowIso() {
  return new Date().toISOString();
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

function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    participants: conversation.participants?.length
      ? conversation.participants
      : [conversation.buyerId, conversation.sellerId],
    unreadBy: conversation.unreadBy ?? [],
    lastMessageAt: conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt ?? nowIso(),
    createdAt: conversation.createdAt ?? nowIso(),
    updatedAt: conversation.updatedAt ?? nowIso(),
  };
}

function normalizeMessage(message: EasyRideMessage): EasyRideMessage {
  return {
    ...message,
    body: message.body ?? "",
    read: Boolean(message.read),
    createdAt: message.createdAt ?? nowIso(),
  };
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((left, right) =>
    String(right.lastMessageAt ?? "").localeCompare(String(left.lastMessageAt ?? "")),
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
    type: "message",
    title: params.title,
    message: params.message,
    actionUrl: params.link,
    link: params.link,
  });
}

async function persistLocalConversationAndMessage(
  conversation: Conversation,
  message: EasyRideMessage,
) {
  const conversations = readLocalConversations().map(normalizeConversation);
  const nextConversation: Conversation = {
    ...conversation,
    lastMessage: message.body,
    lastMessageAt: message.createdAt,
    unreadBy: [
      message.senderId === conversation.buyerId ? conversation.sellerId : conversation.buyerId,
    ],
    updatedAt: message.createdAt,
  };

  const nextConversations = conversations.some((item) => item.id === conversation.id)
    ? conversations.map((item) => (item.id === conversation.id ? nextConversation : item))
    : [nextConversation, ...conversations];

  const messages = readLocalMessages();
  const nextMessages = messages[conversation.id] ?? [];

  writeLocalMessages({
    ...messages,
    [conversation.id]: [...nextMessages, normalizeMessage(message)],
  });
  writeLocalConversations(nextConversations);
}

async function persistLocalRead(conversationIdValue: string, userId: string) {
  const conversations = readLocalConversations().map(normalizeConversation);
  writeLocalConversations(
    conversations.map((conversation) =>
      conversation.id === conversationIdValue
        ? {
            ...conversation,
            unreadBy: conversation.unreadBy.filter((entry) => entry !== userId),
            updatedAt: nowIso(),
          }
        : conversation,
    ),
  );
}

export async function startConversation(
  listing: Vehicle,
  buyer: {
    id: string;
    name: string;
  },
  firstMessage: string,
): Promise<string> {
  const cleanMessage = firstMessage.trim();

  if (!cleanMessage) {
    throw new Error("Enter a message.");
  }

  if (buyer.id === listing.ownerId) {
    throw new Error("You cannot start a conversation on your own listing.");
  }

  const id = conversationId(listing.id, buyer.id, listing.ownerId);
  const firestore = db;
  const recipientId = listing.ownerId;
  const now = Timestamp.now();

  if (!firebaseReady || !firestore) {
    const existing =
      readLocalConversations().find((conversation) => conversation.id === id) ??
      normalizeConversation({
        id,
        listingId: listing.id,
        listingTitle: `${listing.make} ${listing.model} ${listing.year}`,
        listingImage: listing.coverImage,
        buyerId: buyer.id,
        buyerName: buyer.name,
        sellerId: listing.ownerId,
        sellerName: listing.ownerName,
        participants: [buyer.id, listing.ownerId],
        lastMessage: cleanMessage,
        lastMessageAt: nowIso(),
        unreadBy: [listing.ownerId],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

    await persistLocalConversationAndMessage(existing, {
      id: crypto.randomUUID(),
      conversationId: id,
      senderId: buyer.id,
      senderName: buyer.name,
      body: cleanMessage,
      read: false,
      createdAt: nowIso(),
    });

    await notifyRecipient({
      recipientId,
      title: "New Message",
      message: `${buyer.name} sent a message about ${listing.make} ${listing.model}.`,
      link: `/messages?conversation=${id}`,
    });

    return id;
  }

  const conversationReference = doc(firestore, "conversations", id);
  const existingConversation = await getDoc(conversationReference);

  if (!existingConversation.exists()) {
    await setDoc(conversationReference, {
      listingId: listing.id,
      listingTitle: `${listing.make} ${listing.model} ${listing.year}`,
      listingImage: listing.coverImage,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: listing.ownerId,
      sellerName: listing.ownerName,
      participants: [buyer.id, listing.ownerId],
      lastMessage: cleanMessage,
      lastMessageAt: now,
      unreadBy: [listing.ownerId],
      createdAt: now,
      updatedAt: now,
    });
  }

  await addDoc(collection(firestore, "conversations", id, "messages"), {
    conversationId: id,
    senderId: buyer.id,
    senderName: buyer.name,
    body: cleanMessage,
    read: false,
    createdAt: now,
  });

  await updateDoc(conversationReference, {
    lastMessage: cleanMessage,
    lastMessageAt: now,
    unreadBy: [listing.ownerId],
    updatedAt: now,
  });

    await notifyRecipient({
      recipientId,
      title: "New Message",
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
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error("Enter a message.");
  }

  if (!conversation.participants.includes(sender.id)) {
    throw new Error("You are not part of this conversation.");
  }

  const recipientId =
    sender.id === conversation.buyerId ? conversation.sellerId : conversation.buyerId;
  const firestore = db;
  const now = Timestamp.now();

  if (!firebaseReady || !firestore) {
    await persistLocalConversationAndMessage(conversation, {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderId: sender.id,
      senderName: sender.name,
      body: cleanBody,
      read: false,
      createdAt: nowIso(),
    });

    await notifyRecipient({
      recipientId,
      title: "New Message",
      message: `${sender.name} sent a message about ${conversation.listingTitle}.`,
      link: `/messages?conversation=${conversation.id}`,
    });
    return;
  }

  await addDoc(collection(firestore, "conversations", conversation.id, "messages"), {
    conversationId: conversation.id,
    senderId: sender.id,
    senderName: sender.name,
    body: cleanBody,
    read: false,
    createdAt: now,
  });

  await updateDoc(doc(firestore, "conversations", conversation.id), {
    lastMessage: cleanBody,
    lastMessageAt: now,
    unreadBy: [recipientId],
    updatedAt: now,
  });

  await notifyRecipient({
    recipientId,
    title: "New Message",
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
        [...messages]
          .map(normalizeMessage)
          .sort((left, right) =>
            String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")),
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
    limit(150),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    callback(
      snapshot.docs.map(
        (messageDocument: QueryDocumentSnapshot<DocumentData>) =>
          ({
            id: messageDocument.id,
            ...messageDocument.data(),
          } as EasyRideMessage),
      ),
    );
  });
}

export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void,
): () => void {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    const emit = () => {
      callback(
        sortConversations(
          readLocalConversations()
            .map(normalizeConversation)
            .filter((conversation) => conversation.participants.includes(userId)),
        ),
      );
    };

    emit();

    const listener = () => emit();
    window.addEventListener("storage", listener);
    window.addEventListener(CONVERSATIONS_EVENT, listener);

    return () => {
      window.removeEventListener("storage", listener);
      window.removeEventListener(CONVERSATIONS_EVENT, listener);
    };
  }

  const conversationsQuery = query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
    limit(50),
  );

  return onSnapshot(conversationsQuery, (snapshot) => {
    callback(
      snapshot.docs.map(
        (conversationDocument) =>
          ({
            id: conversationDocument.id,
            ...conversationDocument.data(),
          } as Conversation),
      ),
    );
  });
}

export async function getConversationById(conversationIdValue: string): Promise<Conversation | null> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return (
      readLocalConversations().map(normalizeConversation).find((conversation) => conversation.id === conversationIdValue) ??
      null
    );
  }

  const snapshot = await getDoc(doc(firestore, "conversations", conversationIdValue));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Conversation, "id">),
  } as Conversation;
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    return sortConversations(
      readLocalConversations()
        .map(normalizeConversation)
        .filter((conversation) => conversation.participants.includes(userId)),
    );
  }

  const conversationsQuery = query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
    limit(50),
  );

  const snapshot = await getDocs(conversationsQuery);

  return snapshot.docs.map(
    (conversationDocument) =>
      ({
        id: conversationDocument.id,
        ...conversationDocument.data(),
      } as Conversation),
  );
}

export async function markConversationRead(conversationIdValue: string, userId: string): Promise<void> {
  const firestore = db;

  if (!firebaseReady || !firestore) {
    await persistLocalRead(conversationIdValue, userId);
    return;
  }

  await updateDoc(doc(firestore, "conversations", conversationIdValue), {
    unreadBy: arrayRemove(userId),
    updatedAt: Timestamp.now(),
  });
}
