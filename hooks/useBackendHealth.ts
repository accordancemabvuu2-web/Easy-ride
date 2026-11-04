"use client";

import { ApiError, getApiHealthUrl } from "@/lib/apiClient";
import { useCallback, useEffect, useRef, useState } from "react";

export type BackendHealthState = "checking" | "available" | "unavailable" | "misconfigured";

interface BackendHealth {
  state: BackendHealthState;
  message?: string;
  checkedAt?: Date;
  check: () => Promise<void>;
}

const HEALTH_CHECK_INTERVAL_MS = 60_000;

export function useBackendHealth(enabled = true): BackendHealth {
  const [state, setState] = useState<BackendHealthState>("checking");
  const [message, setMessage] = useState<string>();
  const [checkedAt, setCheckedAt] = useState<Date>();
  const requestInFlight = useRef(false);

  const check = useCallback(async () => {
    if (!enabled || requestInFlight.current) return;
    requestInFlight.current = true;
    setState("checking");

    try {
      const response = await fetch(getApiHealthUrl(), {
        headers: { Accept: "application/json" },
        credentials: "include",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        throw new ApiError(`Health endpoint returned HTTP ${response.status}.`, "HEALTH_CHECK_FAILED", response.status);
      }
      setState("available");
      setMessage(undefined);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      setState(apiError?.code === "CONFIGURATION_ERROR" ? "misconfigured" : "unavailable");
      setMessage(error instanceof Error ? error.message : "The backend health check failed.");
    } finally {
      requestInFlight.current = false;
      setCheckedAt(new Date());
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void check();
    const interval = window.setInterval(() => void check(), HEALTH_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [check, enabled]);

  return { state, message, checkedAt, check };
}
