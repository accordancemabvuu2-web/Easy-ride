import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMocks,
}));

import {
  getPendingDealerApplications,
  reviewDealerApplication,
} from "@/services/dealerVerificationAdminService";

describe("admin dealer verification API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads pending applications from the authenticated admin API", async () => {
    apiMocks.get.mockResolvedValue({
      success: true,
      data: [{
        _id: "0123456789abcdef01234567",
        userId: "1123456789abcdef01234567",
        businessName: "Harare Motors",
        businessRegistrationNumber: "REG-12",
        contactEmail: "dealer@example.test",
        verificationStatus: "pending",
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    const page = await getPendingDealerApplications();

    expect(apiMocks.get).toHaveBeenCalledWith(
      "/admin/dealers?status=pending&page=1&pageSize=100",
    );
    expect(page.applications[0]).toMatchObject({
      id: "0123456789abcdef01234567",
      userId: "1123456789abcdef01234567",
      businessName: "Harare Motors",
      businessRegistrationNumber: "REG-12",
      contactEmail: "dealer@example.test",
    });
  });

  it("uses the server-side review operation and requires rejection reasons", async () => {
    apiMocks.patch.mockResolvedValue({ success: true, data: {}, meta: {} });

    await expect(reviewDealerApplication("0123456789abcdef01234567", "reject"))
      .rejects.toThrow("A reason is required");
    expect(apiMocks.patch).not.toHaveBeenCalled();

    await reviewDealerApplication("0123456789abcdef01234567", "reject", "Missing registration proof");

    expect(apiMocks.patch).toHaveBeenCalledWith(
      "/admin/dealers/0123456789abcdef01234567/review",
      { decision: "reject", reason: "Missing registration proof" },
    );
  });
});
