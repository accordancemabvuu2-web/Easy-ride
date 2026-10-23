import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/easy_ride_test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_32";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_that_is_long_enough_32";
process.env.SWAGGER_ENABLED = "true";
const { app } = await import("../app.js");
const { openApiSpec } = await import("../config/swagger.js");

describe("Swagger and OpenAPI", () => {
  it("serves the interactive UI at /api-docs", async () => {
    const response = await request(app).get("/api-docs/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Swagger UI");
    expect(response.text).toContain("Easy Ride API");
  });

  it("serves a valid OpenAPI document at /api-docs.json", async () => {
    const response = await request(app).get("/api-docs.json");
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info).toMatchObject({ title: "Easy Ride API", version: "1.0.0" });
    expect(response.body.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer", bearerFormat: "JWT" });
  });

  it("documents the registered route inventory without inventing pending features", () => {
    const documented = new Set<string>();
    for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
      const operations = pathItem as unknown as Record<string, { servers?: readonly { url: string }[] } | undefined>;
      for (const method of ["get", "post", "put", "patch", "delete"] as const) {
        const operation = operations[method];
        if (!operation) continue;
        const prefix = operation.servers?.[0]?.url ?? openApiSpec.servers[0]!.url;
        const normalizedPrefix = prefix.startsWith("http") ? new URL(prefix).pathname.replace(/\/$/, "") : prefix.replace(/\/$/, "");
        documented.add(`${method.toUpperCase()} ${normalizedPrefix}${path}`);
      }
    }
    const registered = [
      "GET /",
      "GET /health/live", "GET /health/ready",
      "POST /api/v1/auth/register", "POST /api/v1/auth/login", "POST /api/v1/auth/refresh", "POST /api/v1/auth/logout", "POST /api/v1/auth/logout-all", "GET /api/v1/auth/me",
      "GET /api/v1/users/me", "PATCH /api/v1/users/me", "DELETE /api/v1/users/me",
      "GET /api/v1/users/{id}/reviews",
      "GET /api/v1/vehicles", "GET /api/v1/vehicles/featured", "GET /api/v1/vehicles/trending", "GET /api/v1/vehicles/compare", "GET /api/v1/vehicles/catalog/makes", "GET /api/v1/vehicles/catalog/models", "GET /api/v1/vehicles/catalog/locations", "GET /api/v1/vehicles/catalog/currencies", "GET /api/v1/vehicles/estimate", "GET /api/v1/vehicles/me/recently-viewed", "GET /api/v1/vehicles/me/saved", "PUT /api/v1/vehicles/me/saved/{vehicleId}", "DELETE /api/v1/vehicles/me/saved/{vehicleId}",
      "GET /api/v1/vehicles/{id}", "POST /api/v1/vehicles", "PATCH /api/v1/vehicles/{id}", "DELETE /api/v1/vehicles/{id}", "POST /api/v1/vehicles/{id}/publish",
      "GET /api/v1/vehicles/{id}/similar", "GET /api/v1/vehicles/{id}/availability",
      "GET /api/v1/bookings/me", "GET /api/v1/bookings/{id}", "POST /api/v1/bookings", "POST /api/v1/bookings/{id}/cancel", "POST /api/v1/bookings/{id}/extend", "POST /api/v1/bookings/{id}/handover", "POST /api/v1/bookings/{id}/disputes",
      "POST /api/v1/offers", "GET /api/v1/offers/me", "PATCH /api/v1/offers/{id}/status",
      "POST /api/v1/dealers", "GET /api/v1/dealers/{id}", "GET /api/v1/dealers/{id}/reviews", "PATCH /api/v1/dealers/me", "GET /api/v1/dealers/me/vehicles",
      "GET /api/v1/saved-searches", "POST /api/v1/saved-searches", "PATCH /api/v1/saved-searches/{id}", "DELETE /api/v1/saved-searches/{id}",
      "GET /api/v1/conversations", "POST /api/v1/conversations", "GET /api/v1/conversations/{id}/messages", "POST /api/v1/conversations/{id}/messages",
      "GET /api/v1/notifications", "PATCH /api/v1/notifications/{id}/read", "POST /api/v1/reviews", "GET /api/v1/reviews/users/{id}", "POST /api/v1/reviews/{id}/response", "POST /api/v1/reports",
      "GET /api/v1/payments/me", "POST /api/v1/payments/checkout", "GET /api/v1/payments/{id}", "POST /api/v1/finance/calculate",
      "GET /api/v1/support", "POST /api/v1/support", "GET /api/v1/support/{id}/messages", "POST /api/v1/support/{id}/messages", "GET /api/v1/verification/me", "POST /api/v1/verification",
      "GET /api/v1/admin/dashboard", "GET /api/v1/admin/users", "PATCH /api/v1/admin/users/{id}/status", "GET /api/v1/admin/vehicles", "PATCH /api/v1/admin/vehicles/{id}/review", "GET /api/v1/admin/dealers", "PATCH /api/v1/admin/dealers/{id}/review", "GET /api/v1/admin/reports", "PATCH /api/v1/admin/reports/{id}", "GET /api/v1/admin/reviews", "PATCH /api/v1/admin/reviews/{id}", "GET /api/v1/admin/verification-requests", "PATCH /api/v1/admin/verification-requests/{id}", "GET /api/v1/admin/support", "PATCH /api/v1/admin/support/{id}/status", "GET /api/v1/admin/audit-logs",
    ];
    expect([...documented].sort()).toEqual(registered.sort());
    expect(Object.keys(openApiSpec.paths)).toContain("/dealers");
    expect(Object.keys(openApiSpec.paths)).toContain("/payments/checkout");
  });

  it("resolves every component reference and documents auth on protected inventory", () => {
    const serialized = JSON.stringify(openApiSpec);
    const references = [...serialized.matchAll(/#\/components\/schemas\/([A-Za-z0-9_]+)/g)].map((match) => match[1]!);
    for (const name of references) expect(openApiSpec.components.schemas).toHaveProperty(name);
    expect(openApiSpec.paths["/admin/dashboard"]?.get).toHaveProperty("security");
    expect(openApiSpec.paths["/finance/calculate"]?.post).not.toHaveProperty("security");
  });
});
