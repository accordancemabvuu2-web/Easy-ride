import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/easy_ride_test";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_32";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_that_is_long_enough_32";
process.env.SWAGGER_ENABLED = "false";
const { app } = await import("../app.js");

describe("disabled Swagger configuration", () => {
  it("omits the docs link from the API root and returns 404 for both docs routes", async () => {
    const root = await request(app).get("/");
    expect(root.status).toBe(200);
    expect(root.body.documentation).toBeNull();
    for (const path of ["/api-docs", "/api-docs.json"]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }
  });
});
