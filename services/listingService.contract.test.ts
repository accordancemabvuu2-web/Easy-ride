import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getAccessToken: vi.fn(() => "access-token"),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
  getAccessToken: apiMocks.getAccessToken,
  ApiError: class ApiError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, code = "API_ERROR", statusCode = 500) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { createListing, getListingById, getMyListings, updateListingStatus } from "@/services/listingService";

describe("vehicle service API contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads authenticated inventory from the backend without trusting a supplied owner ID", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: [{ _id: "listing-1", sellerId: "owner-1", moderationStatus: "pending_review", availabilityStatus: "available" }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    const listings = await getMyListings("untrusted-owner-id");

    expect(apiMocks.get).toHaveBeenCalledWith("/vehicles/me?page=1&pageSize=100");
    expect(listings).toMatchObject([{ id: "listing-1", ownerId: "owner-1", status: "pending" }]);
  });

  it("falls back to the protected owner detail route only after a public 404", async () => {
    apiMocks.get
      .mockRejectedValueOnce(new (await import("@/lib/apiClient")).ApiError("Missing", "NOT_FOUND", 404))
      .mockResolvedValueOnce({ success: true, data: { _id: "private-1", moderationStatus: "pending_review" }, meta: {} });

    const listing = await getListingById("private-1");

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, "/vehicles/private-1");
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, "/vehicles/me/private-1");
    expect(listing).toMatchObject({ id: "private-1", status: "pending" });
  });

  it("creates listings through the strict API payload and never sends UI owner fields", async () => {
    apiMocks.post.mockResolvedValue({ success: true, data: { id: "listing-2", moderationStatus: "pending_review" }, meta: {} });
    const created = await createListing({
      ownerId: "owner-2",
      ownerName: "UI name",
      ownerPhone: "UI phone",
      ownerEmail: "ui@example.test",
      dealerId: undefined,
      listingType: "buy",
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      price: 10000,
      currency: "USD",
      transmission: "Automatic",
      fuelType: "Petrol",
      mileage: 20000,
      condition: "Good",
      description: "A test vehicle",
      location: { address: "Street", city: "Harare", country: "Zimbabwe", latitude: -17, longitude: 31 },
      images: [],
      coverImage: "",
      sellerType: "Private Seller",
      verified: false,
      featured: false,
    });

    expect(apiMocks.post).toHaveBeenCalledWith("/vehicles", expect.objectContaining({
      make: "Toyota",
      model: "Corolla",
      listingType: "sale",
      salePrice: 10000,
    }));
    const body = apiMocks.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("ownerId");
    expect(body).not.toHaveProperty("images");
    expect(created.id).toBe("listing-2");
  });

  it("uses the backend moderation and availability routes for state changes", async () => {
    apiMocks.get.mockResolvedValue({ success: true, data: { _id: "listing-3", moderationStatus: "pending_review" }, meta: {} });
    apiMocks.patch.mockResolvedValue({ success: true, data: {}, meta: {} });

    await updateListingStatus("listing-3", "active");
    expect(apiMocks.get).toHaveBeenCalledWith("/admin/vehicles/listing-3");
    expect(apiMocks.patch).toHaveBeenCalledWith("/admin/vehicles/listing-3/review", { decision: "approve" });

    apiMocks.patch.mockClear();
    await updateListingStatus("listing-3", "sold");
    expect(apiMocks.patch).toHaveBeenCalledWith("/vehicles/listing-3/availability", { availabilityStatus: "sold" });
  });
});
