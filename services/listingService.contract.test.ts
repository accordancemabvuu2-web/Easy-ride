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

import {
  createListing,
  getSimilarListings,
  getListingById,
  getMyDrafts,
  getMyListings,
  removeVehicleImage,
  reorderVehicleImages,
  saveListingDraft,
  submitListingDraft,
  updateListingStatus,
  uploadVehicleImages,
} from "@/services/listingService";

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

  it("loads similar vehicles from the bounded detail endpoint instead of the full catalog", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: [{ _id: "similar-1", make: "Toyota", model: "Corolla", year: 2021, listingType: "sale", moderationStatus: "published", availabilityStatus: "available" }],
      meta: { limit: 12 },
    });

    const [first, second] = await Promise.all([
      getSimilarListings("source-vehicle"),
      getSimilarListings("source-vehicle"),
    ]);

    expect(first).toMatchObject([{ id: "similar-1" }]);
    expect(second).toEqual(first);
    expect(apiMocks.get).toHaveBeenCalledOnce();
    expect(apiMocks.get).toHaveBeenCalledWith("/vehicles/source-vehicle/similar");
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
    expect(created.status).toBe("pending");
  });

  it("creates, resumes, updates and submits drafts through owner-scoped backend routes", async () => {
    apiMocks.post.mockResolvedValueOnce({ success: true, data: { id: "draft-1", moderationStatus: "draft" }, meta: {} });
    await expect(saveListingDraft({ make: "Toyota" })).resolves.toBe("draft-1");
    expect(apiMocks.post).toHaveBeenCalledWith("/vehicles", { make: "Toyota", moderationStatus: "draft" });

    apiMocks.patch.mockResolvedValue({ success: true, data: {}, meta: {} });
    await expect(saveListingDraft({ make: "Toyota", model: "Corolla" }, "draft-1")).resolves.toBe("draft-1");
    expect(apiMocks.patch).toHaveBeenCalledWith("/vehicles/draft-1", { make: "Toyota", model: "Corolla" });

    apiMocks.get.mockResolvedValue({ success: true, data: [], meta: { page: 1, pageSize: 100, total: 0 } });
    await expect(getMyDrafts()).resolves.toEqual([]);
    expect(apiMocks.get).toHaveBeenCalledWith("/vehicles/me/drafts?page=1&pageSize=100");

    apiMocks.post.mockResolvedValue({ success: true, data: {}, meta: {} });
    await expect(submitListingDraft("draft-1")).resolves.toBeUndefined();
    expect(apiMocks.post).toHaveBeenLastCalledWith("/vehicles/draft-1/submit");
  });

  it("reorders and removes persisted draft photos using the backend image endpoints", async () => {
    apiMocks.patch.mockResolvedValue({ success: true, data: {}, meta: {} });
    apiMocks.delete.mockResolvedValue({ success: true, data: {}, meta: {} });

    await reorderVehicleImages("draft-2", ["image-a", "image-b"]);
    await removeVehicleImage("draft-2", "image-a");

    expect(apiMocks.patch).toHaveBeenCalledWith("/vehicles/draft-2/images/order", { imageIds: ["image-a", "image-b"] });
    expect(apiMocks.delete).toHaveBeenCalledWith("/vehicles/draft-2/images/image-a");
  });

  it("returns uploaded image metadata in backend display order", async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: [
        { id: "image-first", imageUrl: "https://images.example.test/first.jpg", displayOrder: 0, moderationStatus: "pending" },
        { id: "image-second", imageUrl: "https://images.example.test/second.jpg", displayOrder: 1, moderationStatus: "pending" },
      ],
      meta: {},
    });
    const files = [
      new File(["one"], "first.jpg", { type: "image/jpeg" }),
      new File(["two"], "second.jpg", { type: "image/jpeg" }),
    ];

    await expect(uploadVehicleImages("listing-2", files)).resolves.toEqual([
      { id: "image-first", imageUrl: "https://images.example.test/first.jpg", displayOrder: 0 },
      { id: "image-second", imageUrl: "https://images.example.test/second.jpg", displayOrder: 1 },
    ]);
  });

  it("surfaces an unavailable image-storage response instead of reporting upload success", async () => {
    const storageError = new (await import("@/lib/apiClient")).ApiError(
      "Vehicle image storage is not configured.",
      "IMAGE_STORAGE_UNAVAILABLE",
      503,
    );
    apiMocks.post.mockRejectedValue(storageError);
    const photo = new File(["jpeg"], "front.jpg", { type: "image/jpeg" });

    await expect(uploadVehicleImages("listing-2", [photo])).rejects.toBe(storageError);
    expect(apiMocks.post).toHaveBeenCalledWith(
      "/vehicles/listing-2/images",
      expect.any(FormData),
    );
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
