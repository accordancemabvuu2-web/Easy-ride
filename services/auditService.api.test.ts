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

import { createAuditLog, getAuditLogs } from "@/services/auditService";

describe("authoritative audit API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads paginated backend audit events without inventing names or metadata", async () => {
    apiMocks.get.mockResolvedValue({
      data: [{
        _id: "log-1",
        actorId: "actor-123456",
        action: "report.resolved",
        resourceType: "report",
        resourceId: "report-1",
        metadata: { privateNote: "not exposed by the UI adapter" },
        timestamp: "2026-11-26T10:00:00.000Z",
      }],
      meta: { total: 31, page: 2, pageSize: 30 },
    });

    await expect(getAuditLogs(2, 30)).resolves.toEqual({
      logs: [{
        id: "log-1",
        actorId: "actor-123456",
        actorName: "Actor 123456",
        actorRole: "Not included in the audit record",
        action: "report.resolved",
        targetType: "report",
        targetId: "report-1",
        description: "report.resolved · report · report-1",
        createdAt: "2026-11-26T10:00:00.000Z",
      }],
      total: 31,
      page: 2,
      pageSize: 30,
    });
    expect(apiMocks.get).toHaveBeenCalledWith("/admin/audit-logs?page=2&pageSize=30");
  });

  it("rejects invalid pagination and malformed backend responses", async () => {
    await expect(getAuditLogs(0, 30)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(apiMocks.get).not.toHaveBeenCalled();

    apiMocks.get.mockResolvedValue({ data: [], meta: { total: -1 } });
    await expect(getAuditLogs()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("does not allow the browser to manufacture audit records", async () => {
    await expect(createAuditLog({ actorId: "forged" })).rejects.toMatchObject({
      code: "FEATURE_UNAVAILABLE",
      statusCode: 501,
    });
    expect(apiMocks.post).not.toHaveBeenCalled();
  });
});

