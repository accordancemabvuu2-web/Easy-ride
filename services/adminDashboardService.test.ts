import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));

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

import { getAdminDashboardData } from "@/services/adminDashboardService";

const counts = {
  users: 12,
  dealersPending: 2,
  vehiclesPending: 3,
  openReports: 1,
  openSupport: 4,
  bookings: 5,
  payments: 0,
  offers: 6,
};

describe("admin dashboard API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads authoritative counts and a bounded pending-listing page from the backend", async () => {
    apiMocks.get
      .mockResolvedValueOnce({ data: counts, meta: {} })
      .mockResolvedValueOnce({
        data: [{
          _id: "0123456789abcdef01234567",
          make: "Toyota",
          model: "Corolla",
          year: 2020,
          moderationStatus: "pending_review",
          sellerId: "1123456789abcdef01234567",
          salePrice: 12000,
          location: { city: "Harare", country: "ZW" },
        }],
        meta: { page: 1, pageSize: 4, total: 3 },
      });

    const result = await getAdminDashboardData();

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, "/admin/dashboard");
    expect(apiMocks.get).toHaveBeenNthCalledWith(
      2,
      "/admin/vehicles?status=pending_review&page=1&pageSize=4",
    );
    expect(result.counts).toEqual(counts);
    expect(result.pendingListings).toHaveLength(1);
    expect(result.pendingListings[0]).toMatchObject({
      id: "0123456789abcdef01234567",
      make: "Toyota",
      status: "pending",
    });
  });

  it("rejects malformed dashboard counts instead of showing misleading zeros", async () => {
    apiMocks.get
      .mockResolvedValueOnce({ data: { ...counts, payments: -1 }, meta: {} })
      .mockResolvedValueOnce({ data: [], meta: { total: 0 } });

    await expect(getAdminDashboardData()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      statusCode: 502,
    });
  });
});
