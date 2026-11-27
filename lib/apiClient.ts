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
  requires2FA?: boolean;
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    code = "API_ERROR",
    statusCode = 500,
    details?: unknown,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
let accessToken: string | null = null;
let accessTokenRevision = 0;
let refreshPromise: Promise<string | null> | null = null;
let refreshTemporarilyUnavailable = false;

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
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    return `${window.location.origin}/api/v1`;
  }

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

export function wasRefreshTemporarilyUnavailable(): boolean {
  return refreshTemporarilyUnavailable;
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
  accessTokenRevision += 1;
}

function logAuthDiagnostic(event: string, details: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "development") {
    console.info(`[AuthDiagnostic] ${event}`, details);
  }
}

function getDiagnosticUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

function isDiagnosticAuthUrl(url: string): boolean {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  return ["/auth/login", "/auth/me", "/auth/refresh"].some((path) =>
    pathname.endsWith(path)
  );
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    logAuthDiagnostic("Refresh request joined an in-flight attempt", {});
    return refreshPromise;
  }

  const requestTokenRevision = accessTokenRevision;
  refreshTemporarilyUnavailable = false;
  const refreshUrl = `${getConfiguredBaseUrl()}/auth/refresh`;
  const requestPromise = Promise.resolve().then(async () => {
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          logAuthDiagnostic("Refresh API request started", {
            method: "POST",
            url: getDiagnosticUrl(refreshUrl),
            credentialsIncluded: true,
            attempt: attempt + 1,
          });

          const response = await fetch(refreshUrl, {
            method: "POST",
            headers: { Accept: "application/json" },
            credentials: "include",
            cache: "no-store",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          logAuthDiagnostic("Refresh API response received", {
            status: response.status,
            ok: response.ok,
          });

          if (response.status === 429) {
            refreshTemporarilyUnavailable = true;
            return requestTokenRevision !== accessTokenRevision ? accessToken : null;
          }

          if (response.status >= 500) {
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 300));
              continue;
            }
            refreshTemporarilyUnavailable = true;
            return requestTokenRevision !== accessTokenRevision ? accessToken : null;
          }

          if (!response.ok) {
            if (requestTokenRevision !== accessTokenRevision) return accessToken;
            setAccessToken(null);
            authFailureHandler?.();
            return null;
          }

          const payload = (await response.json()) as ApiResponse<{ accessToken?: string }>;
          const newToken = payload.data?.accessToken ?? null;
          if (requestTokenRevision !== accessTokenRevision) return accessToken;
          setAccessToken(newToken);
          if (!newToken) authFailureHandler?.();
          return newToken;
        } catch (error) {
          logAuthDiagnostic("Refresh API request failed", {
            errorType: error instanceof Error ? error.name : "UnknownError",
            attempt: attempt + 1,
          });
          if (requestTokenRevision !== accessTokenRevision) return accessToken;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
          refreshTemporarilyUnavailable = true;
          return null;
        }
      }
      refreshTemporarilyUnavailable = true;
      return null;
    } finally {
      refreshPromise = null;
    }
  });

  refreshPromise = requestPromise;
  return requestPromise;
}

function isAuthEndpoint(endpoint: string): boolean {
  return endpoint.includes("/auth/login") || endpoint.includes("/auth/refresh");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function retryDelaySeconds(response: Response, payload: unknown): number | undefined {
  const header = response.headers.get("Retry-After")?.trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
    const retryAt = Date.parse(header);
    if (Number.isFinite(retryAt)) return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
  }

  if (isRecord(payload) && isRecord(payload.meta)) {
    const seconds = payload.meta.retryAfterSeconds;
    if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds);
    }
  }
  return undefined;
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = undefined;
  }

  if (response.status === 429) {
    const retryAfterSeconds = retryDelaySeconds(response, payload);
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
    const serverMessage = typeof error?.message === "string" ? error.message : "Too many requests.";
    const waitMessage = retryAfterSeconds === undefined
      ? "Please wait a moment before trying again."
      : retryAfterSeconds === 0
        ? "You can try again now."
        : `Please try again in ${retryAfterSeconds} seconds.`;
    throw new ApiError(
      `${serverMessage} ${waitMessage}`,
      typeof error?.code === "string" ? error.code : "RATE_LIMIT_EXCEEDED",
      429,
      error?.details,
      retryAfterSeconds,
    );
  }

  if (!isRecord(payload)) {
    throw new ApiError(
      `Received a non-JSON response from the API (${response.status}).`,
      "INVALID_RESPONSE",
      response.status,
    );
  }

  return payload as unknown as ApiResponse<T>;
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

  const method = options.method ?? "GET";
  const diagnosticAuthRequest = isDiagnosticAuthUrl(url);
  if (diagnosticAuthRequest) {
    logAuthDiagnostic(
      endpoint.endsWith("/auth/login") ? "Login API request started" : "API request started",
      {
        method,
        url: getDiagnosticUrl(url),
        credentialsIncluded: (options.credentials ?? "include") === "include",
        ...(endpoint.endsWith("/auth/login")
          ? {
              contentType: headers.get("Content-Type"),
              bodyFields: ["email", "password", "rememberMe", "twoFactorCode"],
            }
          : {}),
      }
    );
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
      cache: options.cache ?? "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (diagnosticAuthRequest) {
      logAuthDiagnostic(
        endpoint.endsWith("/auth/login")
          ? "Login API request failed before receiving a response"
          : "API request failed before receiving a response",
        {
          method,
          url: getDiagnosticUrl(url),
          errorType: error instanceof Error ? error.name : "UnknownError",
        }
      );
    }

    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The API request timed out. Please try again."
        : "The API is unavailable. Please verify the backend is reachable.";
    throw new ApiError(message, error instanceof DOMException ? "TIMEOUT" : "NETWORK_ERROR", 0);
  } finally {
    clearTimeout(timeout);
  }

  if (diagnosticAuthRequest) {
    logAuthDiagnostic(
      endpoint.endsWith("/auth/login")
        ? "Login API response received"
        : "API response received",
      {
        method,
        url: getDiagnosticUrl(url),
        status: response.status,
        ok: response.ok,
      }
    );
  }

  if (response.status === 401 && !isAuthEndpoint(endpoint)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials ?? "include",
        cache: options.cache ?? "no-store",
      });

      if (diagnosticAuthRequest) {
        logAuthDiagnostic("API retry response received", {
          method,
          url: getDiagnosticUrl(url),
          status: response.status,
          ok: response.ok,
        });
      }
    } else if (wasRefreshTemporarilyUnavailable()) {
      throw new ApiError(
        "The session service is temporarily unavailable. Your current session has been kept; retry when the service is reachable.",
        "AUTH_TEMPORARILY_UNAVAILABLE",
        503,
      );
    }
  }

  const json = await parseResponse<T>(response);
  if (response.ok && json.requires2FA) {
    throw new ApiError(
      "Two-factor authentication code is required.",
      "2FA_REQUIRED",
      response.status,
    );
  }
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
