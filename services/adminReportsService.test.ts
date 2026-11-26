import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));

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

import { getAdminReportsPage, updateAdminReport } from "@/services/adminReportsService";

describe("admin reports API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a bounded page and maps target identifiers without extra lookup queries", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "report-1",
        reporterId: "user-1",
        vehicleId: "vehicle-1",
        reason: "suspected_scam",
        description: "The advertised vehicle details do not match.",
        status: "investigating",
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      meta: { page: 2, pageSize: 20, total: 41 },
    });

    await expect(getAdminReportsPage(2, 20)).resolves.toMatchObject({
      page: 2,
      pageSize: 20,
      total: 41,
      reports: [{
        id: "report-1",
        reporterId: "user-1",
        targetType: "vehicle",
        targetId: "vehicle-1",
        status: "investigating",
      }],
    });
    expect(apiMocks.get).toHaveBeenCalledWith("/admin/reports?status=all&page=2&pageSize=20");
  });

  it("requires a resolution and records decisions through the audited backend route", async () => {
    await expect(updateAdminReport("report-1", "resolved"))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 400 });
    expect(apiMocks.patch).not.toHaveBeenCalled();

    apiMocks.patch.mockResolvedValue({ data: {} });
    await updateAdminReport("report-1", "resolved", "Reviewed and corrected the listing information.");

    expect(apiMocks.patch).toHaveBeenCalledWith("/admin/reports/report-1", {
      status: "resolved",
      resolution: "Reviewed and corrected the listing information.",
    });
  });
});
