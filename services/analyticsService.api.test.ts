import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

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

import { getSellerAnalytics } from "@/services/analyticsService";

describe("backend seller analytics service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps persisted views, saved vehicles and conversations for each listing", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: {
        views: 17,
        favorites: 4,
        messageEnquiries: 3,
        listings: [{
          id: "vehicle-1",
          make: "Toyota",
          model: "Corolla",
          year: 2022,
          views: 17,
          favorites: 4,
          messageEnquiries: 3,
        }],
      },
      meta: {},
    });

    await expect(getSellerAnalytics("seller-1")).resolves.toEqual({
      views: 17,
      favorites: 4,
      leadCount: 3,
      conversionRate: (3 / 17) * 100,
      listings: [{
        id: "vehicle-1",
        make: "Toyota",
        model: "Corolla",
        year: 2022,
        views: 17,
        favoritesCount: 4,
        leadCount: 3,
      }],
    });
    expect(apiMocks.get).toHaveBeenCalledWith("/vehicles/me/analytics");
  });

  it("rejects malformed analytics instead of showing unsupported counts as zero", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: { views: 1, favorites: 0, messageEnquiries: 0, listings: [{ id: "vehicle-1" }] },
      meta: {},
    });

    await expect(getSellerAnalytics("seller-1")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      statusCode: 502,
    });
  });
});
