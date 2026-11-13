/**
 * Centralized HTTP client for the independently deployed Easy Ride API.
 *
 * The API base URL must include the version prefix (for example
 * https://api.example.com/api/v1). Authentication is intentionally kept
 * in memory; refresh-token cookies are sent with every request.
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code = "API_ERROR",
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

type AuthFailureHandler = () => void;
let authFailureHandler: AuthFailureHandler | null = null;

export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  authFailureHandler = handler;
}

export interface ApiConfigurationDiagnostic {
  configured: boolean;
  valid: boolean;
}

export function getApiConfigurationDiagnostic(): ApiConfigurationDiagnostic {
  const configuredUrl = configuredApiBaseUrl?.trim();
  if (!configuredUrl) {
    return { configured: false, valid: false };
  }

  try {
    const url = new URL(configuredUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    return {
      configured: true,
      valid:
        (url.protocol === "http:" || url.protocol === "https:") &&
        pathname.endsWith("/api/v1"),
    };
  } catch {
    return { configured: true, valid: false };
  }
}

function getConfiguredBaseUrl(): string {
  const configuredUrl = configuredApiBaseUrl?.trim();

  if (!configuredUrl) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in your build environment or environment variables.",
      "CONFIGURATION_ERROR",
      0
    );
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL including /api/v1.",
      "CONFIGURATION_ERROR",
      0
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.",
      "CONFIGURATION_ERROR",
      0
    );
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith("/api/v1")) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL must include the versioned /api/v1 prefix.",
      "CONFIGURATION_ERROR",
      0
    );
  }

  return `${url.origin}${pathname}`;
}

export function getApiBaseUrl(): string {
  return getConfiguredBaseUrl();
}

export function getApiHealthUrl(): string {
  const baseUrl = new URL(getConfiguredBaseUrl());
  baseUrl.pathname = baseUrl.pathname.replace(/\/api\/v1$/, "/health/ready");
  return baseUrl.toString();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function settleRefreshQueue(token: string | null): void {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => refreshQueue.push(resolve));
  }

  isRefreshing = true;
  try {
    const response = await fetch(`${getConfiguredBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      setAccessToken(null);
      settleRefreshQueue(null);
      authFailureHandler?.();
      return null;
    }

    const payload = (await response.json()) as ApiResponse<{ accessToken?: string }>;
    const newToken = payload.data?.accessToken ?? null;
    setAccessToken(newToken);
    settleRefreshQueue(newToken);
    if (!newToken) {
      authFailureHandler?.();
    }
    return newToken;
  } catch {
    setAccessToken(null);
    settleRefreshQueue(null);
    authFailureHandler?.();
    return null;
  } finally {
    isRefreshing = false;
  }
}

function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.includes("/auth/login") || endpoint.includes("/auth/refresh");
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      `Received a non-JSON response from the API (${response.status}).`,
      "INVALID_RESPONSE",
      response.status
    );
  }

  return (await response.json()) as ApiResponse<T>;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${getConfiguredBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const currentToken = getAccessToken();
  if (currentToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${currentToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
      signal: controller.signal,
    });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The API request timed out. Please try again."
        : "The API is unavailable. Please verify the backend is reachable.";
    throw new ApiError(message, error instanceof DOMException ? "TIMEOUT" : "NETWORK_ERROR", 0);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && !isAuthEndpoint(endpoint)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials ?? "include",
      });
    }
  }

  const json = await parseResponse<T>(response);
  if (!response.ok || json.success === false) {
    const error = json.error ?? {
      code: "REQUEST_FAILED",
      message: `The API request failed with status ${response.status}.`,
    };
    throw new ApiError(error.message, error.code, response.status, error.details);
  }

  return json;
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
