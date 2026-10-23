import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/easy_ride_test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_32";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_that_is_long_enough_32";
process.env.SWAGGER_ENABLED = "true";

vi.mock("../config/database.js", () => ({ databaseReady: vi.fn() }));
const { databaseReady } = await import("../config/database.js");
const { app } = await import("../app.js");

describe("API boundary", () => {
  beforeEach(() => vi.mocked(databaseReady).mockReset().mockResolvedValue(false));

  it("returns root discovery links", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "Welcome to Easy Ride API", apiBase: "/api/v1", health: "/health/live", documentation: "/api-docs" });
  });

  it("allows the configured Next.js development origin through CORS", async () => {
    const response = await request(app).options("/api/v1/vehicles").set("Origin", "http://localhost:3000").set("Access-Control-Request-Method", "GET");
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("reports liveness without a database connection", async () => {
    const response = await request(app).get("/health/live");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("reports readiness as unavailable until MongoDB is connected", async () => {
    const response = await request(app).get("/health/ready");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready", database: "disconnected" });
  });

  it("reports readiness when MongoDB responds", async () => {
    vi.mocked(databaseReady).mockResolvedValue(true);
    const response = await request(app).get("/health/ready");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready", database: "connected" });
  });

  it("uses a structured not found error", async () => {
    const response = await request(app).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  it("returns the normal not found response for an unsupported method", async () => {
    const response = await request(app).post("/health/live");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects vehicle writes without authentication", async () => {
    const response = await request(app).post("/api/v1/vehicles").send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("validates login fields before database access", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({ email: "bad", password: "" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.text).not.toContain(process.env.JWT_ACCESS_SECRET);
  });

  it("calculates an illustrative finance estimate with server-side validation", async () => {
    const response = await request(app).post("/api/v1/finance/calculate").send({ principal: 250000, deposit: 50000, annualInterestRate: 12.5, termMonths: 60, currency: "ZAR" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ currency: "ZAR", monthlyPayment: expect.any(Number), totalRepayment: expect.any(Number), totalInterest: expect.any(Number) });
    expect(response.body.meta.disclaimer).toContain("estimate");
    const invalid = await request(app).post("/api/v1/finance/calculate").send({ principal: 100, deposit: 100, annualInterestRate: 10, termMonths: 12 });
    expect(invalid.status).toBe(400);
  });

  it("protects newly added user and admin resources with the existing JWT middleware", async () => {
    for (const [method, path] of [
      ["get", "/api/v1/saved-searches"], ["get", "/api/v1/conversations"], ["get", "/api/v1/notifications"],
      ["get", "/api/v1/payments/me"], ["get", "/api/v1/support"], ["get", "/api/v1/verification/me"],
      ["get", "/api/v1/admin/dashboard"],
    ] as const) {
      const response = await request(app)[method](path);
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }
  });
});
