import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("API authentication refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("window", { location: { origin: "https://easyride.example" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses same-origin API and health URLs and retries a request with the refreshed token", async () => {
    const responses = [
      jsonResponse(401, { success: false, error: { code: "UNAUTHORIZED", message: "Expired" } }),
      jsonResponse(200, { success: true, data: { accessToken: "fresh-token" } }),
      jsonResponse(200, { success: true, data: { id: "vehicle-1" } }),
    ];
    const requestAuthorization: Array<string | null> = [];
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestAuthorization.push(new Headers(init?.headers).get("Authorization"));
      return Promise.resolve(responses.shift()!);
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");
    client.setAccessToken("old-token");

    await expect(client.api.get("/vehicles/vehicle-1")).resolves.toMatchObject({ data: { id: "vehicle-1" } });

    expect(client.getApiBaseUrl()).toBe("https://easyride.example/api/v1");
    expect(client.getApiHealthUrl()).toBe("https://easyride.example/health/ready");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://easyride.example/api/v1/vehicles/vehicle-1", expect.objectContaining({
      credentials: "include",
      cache: "no-store",
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://easyride.example/api/v1/auth/refresh", expect.objectContaining({
      credentials: "include",
      cache: "no-store",
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "https://easyride.example/api/v1/vehicles/vehicle-1", expect.objectContaining({
      credentials: "include",
      cache: "no-store",
    }));
    expect(requestAuthorization).toEqual(["Bearer old-token", null, "Bearer fresh-token"]);
    expect(client.getAccessToken()).toBe("fresh-token");
  });

  it("keeps the current token and reports temporary unavailability after retryable refresh failures", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(url.endsWith("/auth/refresh")
        ? jsonResponse(503, { success: false, error: { code: "UNAVAILABLE", message: "Unavailable" } })
        : jsonResponse(401, { success: false, error: { code: "UNAUTHORIZED", message: "Expired" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");
    const authFailure = vi.fn();
    client.setAccessToken("still-valid-for-retry");
    client.setAuthFailureHandler(authFailure);

    await expect(client.api.get("/vehicles/private")).rejects.toMatchObject({ code: "AUTH_TEMPORARILY_UNAVAILABLE", statusCode: 503 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(client.getAccessToken()).toBe("still-valid-for-retry");
    expect(client.wasRefreshTemporarilyUnavailable()).toBe(true);
    expect(authFailure).not.toHaveBeenCalled();
  });

  it("does not automatically retry a rate-limited login or refresh request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, {
      success: false,
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Try again later." },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");
    const authFailure = vi.fn();
    client.setAccessToken("current-token");
    client.setAuthFailureHandler(authFailure);

    await expect(client.api.post("/auth/login", { email: "seller@example.test", password: "not-a-real-password" }))
      .rejects.toMatchObject({ statusCode: 429, code: "RATE_LIMIT_EXCEEDED" });
    expect(fetchMock).toHaveBeenCalledOnce();

    await expect(client.refreshAccessToken()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.getAccessToken()).toBe("current-token");
    expect(client.wasRefreshTemporarilyUnavailable()).toBe(true);
    expect(authFailure).not.toHaveBeenCalled();
  });

  it("turns a non-JSON 429 into a useful rate-limit error and never retries it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("upstream rate limit", {
      status: 429,
      headers: { "content-type": "text/html", "retry-after": "30" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");

    await expect(client.api.get("/vehicles?page=1&pageSize=20")).rejects.toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
      statusCode: 429,
      retryAfterSeconds: 30,
      message: "Too many requests. Please try again in 30 seconds.",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses the backend Retry-After metadata when the header is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, {
      success: false,
      error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests." },
      meta: { retryAfterSeconds: 12 },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");

    await expect(client.api.get("/vehicles?page=2&pageSize=20")).rejects.toMatchObject({
      statusCode: 429,
      retryAfterSeconds: 12,
      message: "Too many requests. Please try again in 12 seconds.",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears the session only when refresh rejects the session as unauthenticated", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: { code: "UNAUTHORIZED", message: "Expired" } }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: { code: "SESSION_EXPIRED", message: "Session expired" } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = await import("@/lib/apiClient");
    const authFailure = vi.fn();
    client.setAccessToken("expired-token");
    client.setAuthFailureHandler(authFailure);

    await expect(client.api.get("/vehicles/private")).rejects.toMatchObject({ code: "UNAUTHORIZED", statusCode: 401 });

    expect(client.getAccessToken()).toBeNull();
    expect(client.wasRefreshTemporarilyUnavailable()).toBe(false);
    expect(authFailure).toHaveBeenCalledOnce();
  });
});
