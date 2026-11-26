import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

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

import { getVerificationRequests, submitVerificationRequest } from "@/services/verificationService";

describe("verification request API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an authenticated request without accepting client identity or document claims", async () => {
    apiMocks.post.mockResolvedValue({
      data: { id: "request-1", type: "identity", status: "pending" },
      meta: {},
    });

    await expect(submitVerificationRequest({
      type: "identity",
      notes: "Please review my identity request.",
    })).resolves.toMatchObject({
      id: "request-1",
      type: "identity",
      status: "pending",
    });
    expect(apiMocks.post).toHaveBeenCalledWith("/verification", {
      type: "identity",
      note: "Please review my identity request.",
    });
  });

  it("requires a vehicle id for ownership requests", async () => {
    await expect(submitVerificationRequest({ type: "vehicle_ownership" }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it("maps only the authenticated user's server-side request list", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "request-2",
        userId: "user-1",
        vehicleId: "vehicle-1",
        type: "vehicle_ownership",
        status: "rejected",
        note: "Ownership context",
        reviewReason: "More information required.",
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    await expect(getVerificationRequests("rejected")).resolves.toMatchObject([{
      id: "request-2",
      userId: "user-1",
      vehicleId: "vehicle-1",
      type: "vehicle_ownership",
      status: "rejected",
      notes: "Ownership context",
      rejectionReason: "More information required.",
    }]);
    expect(apiMocks.get).toHaveBeenCalledWith("/verification/me?page=1&pageSize=100");
  });
});

