import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
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

  it("deduplicates concurrent full-list loads across direct and legacy service imports", async () => {
    apiMocks.get.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        success: true,
        data: [{ _id: "vehicle-1", make: "Toyota", model: "Corolla", year: 2022, moderationStatus: "published", availabilityStatus: "available" }],
        meta: { page: 1, pageSize: 100, total: 1 },
      }), 5);
    }));
    const [{ getActiveListings }, legacyServices] = await Promise.all([
      import("@/services/listingService"),
      import("@/lib/clientFirebaseServices"),
    ]);

    const [first, second, throughLegacyFacade] = await Promise.all([
      getActiveListings(),
      getActiveListings(),
      legacyServices.getActiveListings(),
    ]);

    expect(first).toEqual(second);
    expect(throughLegacyFacade).toEqual(first);
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

  it("invalidates browse results after a listing availability change", async () => {
    apiMocks.get.mockResolvedValue({ success: true, data: [], meta: { page: 1, pageSize: 20, total: 0 } });
    apiMocks.patch.mockResolvedValue({ success: true, data: {}, meta: {} });
    const { getActiveListingPage, updateListingStatus } = await import("@/services/listingService");

    await getActiveListingPage();
    await getActiveListingPage();
    expect(apiMocks.get).toHaveBeenCalledOnce();

    await updateListingStatus("vehicle-1", "sold");
    await getActiveListingPage();

    expect(apiMocks.patch).toHaveBeenCalledWith("/vehicles/vehicle-1/availability", { availabilityStatus: "sold" });
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });
});
