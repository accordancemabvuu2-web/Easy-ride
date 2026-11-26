import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
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

import {
  acceptOffer,
  completeVehicleSale,
  createVehicleOffer,
  getUserOffers,
  rejectOffer,
  withdrawOffer,
} from "@/services/offerService";
import type { VehicleOffer } from "@/Types/offer";
import type { Vehicle } from "@/Types/vehicle";

const vehicle = {
  id: "vehicle-1",
  ownerId: "seller-1",
  ownerName: "Seller",
  listingType: "buy",
  status: "active",
  make: "Toyota",
  model: "Corolla",
  year: 2020,
  price: 12000,
  currency: "USD",
  coverImage: "/vehicle.jpg",
} as Vehicle;

const offer: VehicleOffer = {
  id: "offer-1",
  listingId: "vehicle-1",
  listingTitle: "2020 Toyota Corolla",
  listingImage: "/vehicle.jpg",
  buyerId: "buyer-1",
  buyerName: "Buyer",
  buyerEmail: "",
  buyerPhone: "",
  sellerId: "seller-1",
  sellerName: "Seller",
  askingPrice: 12000,
  offeredPrice: 11000,
  currency: "USD",
  buyerMessage: "Can I view it?",
  status: "pending",
};

describe("backend offer service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an offer through the backend without sending profile contact data", async () => {
    apiMocks.post.mockResolvedValue({ data: { id: "offer-1" } });

    await expect(createVehicleOffer({
      vehicle,
      buyer: {
        id: "buyer-1",
        name: "Buyer",
        email: "private@example.test",
        phone: "+263770000000",
      },
      offeredPrice: 11000,
      message: " Can I view it? ",
    })).resolves.toBe("offer-1");

    expect(apiMocks.post).toHaveBeenCalledWith("/offers", {
      vehicleId: "vehicle-1",
      amount: 11000,
      message: "Can I view it?",
    });
  });

  it("maps the authenticated user's backend offer records without exposing contact fields", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "offer-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        vehicleId: {
          _id: "vehicle-1",
          make: "Toyota",
          model: "Corolla",
          year: 2020,
          salePrice: 12000,
        },
        amount: 11000,
        currency: "usd",
        message: "Can I view it?",
        status: "pending",
        createdAt: "2026-11-25T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    const [mapped] = await getUserOffers("buyer-1");

    expect(apiMocks.get).toHaveBeenCalledWith("/offers/me?page=1&pageSize=100");
    expect(mapped).toMatchObject({
      id: "offer-1",
      listingId: "vehicle-1",
      listingTitle: "Toyota Corolla 2020",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      buyerName: "You",
      sellerName: "Seller",
      askingPrice: 12000,
      offeredPrice: 11000,
      buyerMessage: "Can I view it?",
      status: "pending",
      buyerEmail: "",
      buyerPhone: "",
    });
  });

  it("uses backend status transitions and rejects unsupported sale completion", async () => {
    apiMocks.patch.mockResolvedValue({ data: {} });

    await acceptOffer(offer, "seller-1");
    await rejectOffer(offer, "seller-1");
    await withdrawOffer(offer, "buyer-1");

    expect(apiMocks.patch).toHaveBeenNthCalledWith(1, "/offers/offer-1/status", { status: "accepted" });
    expect(apiMocks.patch).toHaveBeenNthCalledWith(2, "/offers/offer-1/status", { status: "rejected" });
    expect(apiMocks.patch).toHaveBeenNthCalledWith(3, "/offers/offer-1/status", { status: "withdrawn" });
    await expect(acceptOffer(offer, "buyer-1")).rejects.toThrow("Only the seller");
    await expect(completeVehicleSale("offer-1", "seller-1")).rejects.toMatchObject({
      code: "FEATURE_UNAVAILABLE",
      statusCode: 501,
    });
  });
});
