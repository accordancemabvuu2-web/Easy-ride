import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "@/Types/vehicle";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
}));

import {
  getUserConversations,
  sendMessage,
  startConversation,
  subscribeToUserConversations,
} from "@/services/messageService";

describe("backend conversation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a conversation on the backend and sends the first message", async () => {
    apiMocks.post
      .mockResolvedValueOnce({ success: true, data: { id: "conversation-1" }, meta: {} })
      .mockResolvedValueOnce({ success: true, data: { id: "message-1" }, meta: {} });

    const vehicle = {
      id: "vehicle-1",
      ownerId: "seller-1",
      make: "Toyota",
      model: "Axio",
      year: 2018,
    } as Vehicle;

    await expect(startConversation(
      vehicle,
      { id: "buyer-1", name: "Buyer" },
      "Is the car available?",
    )).resolves.toBe("conversation-1");

    expect(apiMocks.post).toHaveBeenNthCalledWith(1, "/conversations", {
      vehicleId: "vehicle-1",
    });
    expect(apiMocks.post).toHaveBeenNthCalledWith(
      2,
      "/conversations/conversation-1/messages",
      { text: "Is the car available?" },
    );
  });

  it("maps backend conversations without relying on browser-local data", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: [{
        _id: "conversation-1",
        vehicleId: { _id: "vehicle-1", make: "Toyota", model: "Axio", year: 2018 },
        participantIds: [
          { _id: "buyer-1", firstName: "Tariro", lastName: "Moyo" },
          { _id: "seller-1", firstName: "Kuda", lastName: "Dube" },
        ],
        unreadBy: ["buyer-1"],
        lastMessageAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    const conversations = await getUserConversations("buyer-1");

    expect(apiMocks.get).toHaveBeenCalledWith("/conversations?page=1&pageSize=100");
    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      id: "conversation-1",
      listingId: "vehicle-1",
      listingTitle: "2018 Toyota Axio",
      buyerId: "buyer-1",
      buyerName: "Tariro Moyo",
      sellerId: "seller-1",
      sellerName: "Kuda Dube",
      unreadBy: ["buyer-1"],
    });
  });

  it("rejects sending a message for an account outside the conversation", async () => {
    await expect(sendMessage({
      id: "conversation-1",
      listingId: "vehicle-1",
      listingTitle: "Vehicle",
      listingImage: "",
      buyerId: "buyer-1",
      buyerName: "Buyer",
      sellerId: "seller-1",
      sellerName: "Seller",
      lastMessage: "",
      participants: ["buyer-1", "seller-1"],
      unreadBy: [],
    }, { id: "other-user", name: "Other" }, "Hello"))
      .rejects.toThrow("You are not part of this conversation.");

    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it("reports initial conversation-list failures so the page can leave its loading state", async () => {
    apiMocks.get.mockRejectedValue(new Error("Inbox unavailable"));
    const onError = vi.fn();
    const unsubscribe = subscribeToUserConversations("buyer-1", vi.fn(), onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Inbox unavailable"));
    unsubscribe();
  });
});
