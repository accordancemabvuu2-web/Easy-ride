"use client";

import ErrorState from "@/Components/ErrorState";
import { useBackendHealth } from "@/hooks/useBackendHealth";

export default function BackendHealthStatus() {
  const health = useBackendHealth(process.env.NODE_ENV === "development");

  if (process.env.NODE_ENV !== "development" || health.state === "available" || health.state === "checking") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(360px,calc(100vw-2rem))]">
      <ErrorState
        title={health.state === "misconfigured" ? "API configuration required" : "Backend unavailable"}
        description={health.message || "The frontend is running, but the backend health endpoint cannot be reached."}
        action={
          <button
            type="button"
            onClick={() => void health.check()}
            className="rounded-lg bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084B30]"
          >
            Check again
          </button>
        }
      />
    </div>
  );
}
