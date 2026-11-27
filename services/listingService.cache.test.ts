import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  getAccessToken: vi.fn(() => "session-a"),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
  getAccessToken: apiMocks.getAccessToken,
  ApiError: class ApiError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code = "API_ERROR", statusCode = 500) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

describe("public listing request cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("deduplicates concurrent full-list loads, including Strict Mode remounts", async () => {
    apiMocks.get.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        success: true,
        data: [{ _id: "vehicle-1", make: "Toyota", model: "Corolla", year: 2022, moderationStatus: "published", availabilityStatus: "available" }],
        meta: { page: 1, pageSize: 100, total: 1 },
      }), 5);
    }));
    const { getActiveListings } = await import("@/services/listingService");

    const [first, second] = await Promise.all([getActiveListings(), getActiveListings()]);

    expect(first).toEqual(second);
    expect(apiMocks.get).toHaveBeenCalledOnce();
    expect(apiMocks.get).toHaveBeenCalledWith("/vehicles?page=1&pageSize=100");
  });

  it("caches identical browse pages briefly but keeps separate pagination requests", async () => {
    apiMocks.get.mockResolvedValue({ success: true, data: [], meta: { page: 1, pageSize: 20, total: 45 } });
    const { getActiveListingPage } = await import("@/services/listingService");

    await Promise.all([
      getActiveListingPage(),
      getActiveListingPage(),
      getActiveListingPage({}, { source: "api", page: 2 }),
    ]);

    expect(apiMocks.get).toHaveBeenCalledTimes(2);
    expect(apiMocks.get).toHaveBeenNthCalledWith(1, "/vehicles?page=1&pageSize=20&sort=newest");
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, "/vehicles?page=2&pageSize=20&sort=newest");
  });

  it("does not cache or retry failed listing requests", async () => {
    apiMocks.get
      .mockRejectedValueOnce(new Error("RATE_LIMIT_EXCEEDED"))
      .mockResolvedValueOnce({ success: true, data: [], meta: { page: 1, pageSize: 20, total: 0 } });
    const { getActiveListingPage } = await import("@/services/listingService");

    await expect(getActiveListingPage()).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    expect(apiMocks.get).toHaveBeenCalledOnce();

    await expect(getActiveListingPage()).resolves.toMatchObject({ listings: [], hasMore: false });
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });
});
