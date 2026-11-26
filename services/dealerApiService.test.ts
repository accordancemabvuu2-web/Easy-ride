import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import {
  getMyDealerProfile,
  submitDealerApplication,
} from "@/services/dealerApiService";

describe("backend dealer application service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the authenticated dealer profile from the backend", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: {
        _id: "0123456789abcdef01234567",
        userId: "1123456789abcdef01234567",
        businessName: "Harare Motors",
        businessRegistrationNumber: "REG-1",
        contactEmail: "dealer@example.test",
        contactPhone: "+263771234567",
        verificationStatus: "pending",
        ratingAverage: 4.5,
        ratingCount: 3,
      },
    });

    await expect(getMyDealerProfile()).resolves.toMatchObject({
      id: "0123456789abcdef01234567",
      ownerId: "1123456789abcdef01234567",
      businessName: "Harare Motors",
      status: "pending",
      verified: false,
      averageRating: 4.5,
      reviewCount: 3,
    });
    expect(apiMocks.get).toHaveBeenCalledWith("/dealers/me");
  });

  it("submits only backend-supported application fields", async () => {
    apiMocks.post.mockResolvedValue({
      success: true,
      data: {
        id: "0123456789abcdef01234567",
        businessName: "Harare Motors",
        verificationStatus: "pending",
      },
    });

    await expect(submitDealerApplication(
      {
        id: "1123456789abcdef01234567",
        name: "Tariro Moyo",
        email: "tariro@example.test",
        phone: "+263771234567",
      },
      {
        businessName: "Harare Motors",
        businessRegistrationNumber: "REG-1",
        description: "Vehicle sales",
        contactEmail: "",
        contactPhone: "+263771234567",
        address: "Harare",
      },
    )).resolves.toMatchObject({
      id: "0123456789abcdef01234567",
      ownerId: "1123456789abcdef01234567",
      status: "pending",
    });

    expect(apiMocks.post).toHaveBeenCalledWith("/dealers", {
      businessName: "Harare Motors",
      businessRegistrationNumber: "REG-1",
      description: "Vehicle sales",
      contactEmail: undefined,
      contactPhone: "+263771234567",
      address: "Harare",
      authorizedRepresentative: {
        name: "Tariro Moyo",
        email: "tariro@example.test",
        phone: "+263771234567",
      },
    });
  });
});
