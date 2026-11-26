import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

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

import { createReview, getUserReviews } from "@/services/reviewService";

describe("backend review API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a completed booking reference and submits only backend-supported fields", async () => {
    await expect(createReview({ rating: 5, comment: "Excellent experience." }))
      .rejects.toMatchObject({ code: "INELIGIBLE_TRANSACTION" });
    expect(apiMocks.post).not.toHaveBeenCalled();

    apiMocks.post.mockResolvedValue({ data: { id: "review-1", moderationStatus: "pending" } });
    await createReview({ bookingId: "booking-1", rating: 5, comment: " Excellent experience. " });
    expect(apiMocks.post).toHaveBeenCalledWith("/reviews", {
      bookingId: "booking-1",
      rating: 5,
      comment: "Excellent experience.",
    });
  });

  it("loads approved reviews from the backend without inventing reviewer identity", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "review-1",
        reviewerId: "reviewer-1",
        vehicleId: "vehicle-1",
        rating: 4,
        comment: "Good transaction.",
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    await expect(getUserReviews("seller-1")).resolves.toMatchObject([{
      id: "review-1",
      reviewerId: "reviewer-1",
      reviewedUserId: "seller-1",
      listingId: "vehicle-1",
      rating: 4,
      approved: true,
    }]);
    expect(apiMocks.get).toHaveBeenCalledWith("/reviews/users/seller-1?page=1&pageSize=100");
  });
});

