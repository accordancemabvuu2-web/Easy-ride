"use client";

import { api } from "@/lib/apiClient";
import type { Conversation, EasyRideMessage } from "@/Types/message";
import type { Vehicle } from "@/Types/vehicle";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? value as UnknownRecord : {};
}

function recordId(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const id = record._id ?? record.id;
  return typeof id === "string" ? id : "";
}

function personName(value: unknown, fallback: string): string {
  const person = asRecord(value);
  const name = [person.firstName, person.lastName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
  return name || fallback;
}

function mapConversation(value: unknown, userId: string): Conversation | null {
  const record = asRecord(value);
  const id = recordId(record);
  const rawParticipants = Array.isArray(record.participantIds) ? record.participantIds : [];
  const participantIds = rawParticipants.map(recordId).filter(Boolean);
  const unreadBy = Array.isArray(record.unreadBy)
    ? record.unreadBy.map(recordId).filter(Boolean)
    : [];
  if (!id || participantIds.length !== 2 || !participantIds.includes(userId)) return null;

  const vehicle = asRecord(record.vehicleId);
  const listingId = recordId(record.vehicleId);
  const titleParts = [vehicle.year, vehicle.make, vehicle.model]
    .filter((part) => typeof part === "string" || typeof part === "number");
  const listingTitle = titleParts.join(" ");

  return {
    id,
    listingId,
    listingTitle: listingTitle || "Vehicle enquiry",
    listingImage: "/images/easy-ride-hero.svg",
    buyerId: participantIds[0]!,
    buyerName: personName(rawParticipants[0], "Buyer"),
    sellerId: participantIds[1]!,
    sellerName: personName(rawParticipants[1], "Seller"),
    lastMessage: "Open conversation",
    lastMessageAt: record.lastMessageAt,
    participants: participantIds,
    unreadBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapMessage(value: unknown, conversationId: string): EasyRideMessage | null {
  const record = asRecord(value);
  const id = recordId(record);
  const senderId = recordId(record.senderId);
  if (!id || !senderId || typeof record.text !== "string") return null;

  return {
    id,
    conversationId,
    senderId,
    senderName: "Easy Ride member",
    body: record.text,
    read: record.readAt !== null && record.readAt !== undefined,
    createdAt: record.createdAt,
  };
}

function responseRecords(response: { data?: unknown }, label: string): unknown[] {
  if (!Array.isArray(response.data)) {
    throw new Error("The " + label + " response was invalid. Please retry.");
  }
  return response.data;
}

async function loadConversations(userId: string): Promise<Conversation[]> {
  const response = await api.get<unknown>("/conversations?page=1&pageSize=100");
  return responseRecords(response, "conversation")
    .map((record) => mapConversation(record, userId))
    .filter((record): record is Conversation => record !== null);
}

async function loadMessages(conversationId: string): Promise<EasyRideMessage[]> {
  const response = await api.get<unknown>(
    "/conversations/" + encodeURIComponent(conversationId) + "/messages?page=1&pageSize=100",
  );
  return responseRecords(response, "message")
    .map((record) => mapMessage(record, conversationId))
    .filter((record): record is EasyRideMessage => record !== null)
    .sort((left, right) =>
      String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? "")),
    );
}

function subscribe<T>(
  load: () => Promise<T>,
  callback: (value: T) => void,
  intervalMs: number,
  onError?: (message: string) => void,
): () => void {
  let active = true;
  let inFlight = false;

  const refresh = async () => {
    if (!active || inFlight) return;
    inFlight = true;
    try {
      const value = await load();
      if (active) callback(value);
    } catch (error) {
      if (active) {
        onError?.(error instanceof Error ? error.message : "The messaging service is temporarily unavailable.");
      }
    } finally {
      inFlight = false;
    }
  };

  void refresh();
  const timer = setInterval(() => void refresh(), intervalMs);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

export async function startConversation(
  listing: Vehicle,
  buyer: { id: string; name: string },
  firstMessage: string,
): Promise<string> {
  const cleanMessage = firstMessage.trim();
  if (!cleanMessage) throw new Error("Enter a message.");
  if (buyer.id === listing.ownerId) {
    throw new Error("You cannot start a conversation on your own listing.");
  }

  const response = await api.post<unknown>("/conversations", { vehicleId: listing.id });
  const conversationId = recordId(response.data);
  if (!conversationId) throw new Error("The conversation response was invalid. Please retry.");

  await api.post(
    "/conversations/" + encodeURIComponent(conversationId) + "/messages",
    { text: cleanMessage },
  );
  return conversationId;
}

export async function sendMessage(
  conversation: Conversation,
  sender: { id: string; name: string },
  body: string,
): Promise<void> {
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("Enter a message.");
  if (!conversation.participants.includes(sender.id)) {
    throw new Error("You are not part of this conversation.");
  }

  await api.post(
    "/conversations/" + encodeURIComponent(conversation.id) + "/messages",
    { text: cleanBody },
  );
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: EasyRideMessage[]) => void,
  onError?: (message: string) => void,
): () => void {
  return subscribe(() => loadMessages(conversationId), callback, 8_000, onError);
}

export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (message: string) => void,
): () => void {
  return subscribe(() => loadConversations(userId), callback, 15_000, onError);
}

export async function getConversationById(
  conversationId: string,
): Promise<Conversation | null> {
  const response = await api.get<unknown>("/auth/me");
  const user = asRecord(asRecord(response.data).user);
  const userId = recordId(user);
  if (!userId) return null;
  return (await loadConversations(userId)).find((conversation) =>
    conversation.id === conversationId,
  ) ?? null;
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  return loadConversations(userId);
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  void userId;
  await loadMessages(conversationId);
}
