import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { createNotification, getUserNotifications, markNotificationRead } from "@/services/notificationService";

describe("backend notification API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads notifications for the authenticated account and maps unread state", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "notification-1",
        type: "new_message",
        title: "New message",
        message: "A user sent you a message.",
        resourceType: "conversation",
        resourceId: "conversation-1",
        readAt: null,
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    await expect(getUserNotifications("user-1")).resolves.toMatchObject([{
      id: "notification-1",
      userId: "user-1",
      type: "new_message",
      read: false,
      actionUrl: "/messages",
    }]);
    expect(apiMocks.get).toHaveBeenCalledWith("/notifications?page=1&pageSize=100");
  });

  it("marks records read through the authenticated backend route", async () => {
    apiMocks.patch.mockResolvedValue({ data: { read: true } });
    await markNotificationRead("notification-1");
    expect(apiMocks.patch).toHaveBeenCalledWith("/notifications/notification-1/read", {});
  });

  it("rejects browser-created notifications", async () => {
    await expect(createNotification("user-1", "Title", "Message", "offer"))
      .rejects.toMatchObject({ code: "FEATURE_UNAVAILABLE", statusCode: 501 });
    expect(apiMocks.post).not.toHaveBeenCalled();
  });
});

