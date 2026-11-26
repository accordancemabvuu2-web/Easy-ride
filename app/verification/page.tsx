"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings } from "@/lib/clientFirebaseServices";
import { getVerificationRequests, submitVerificationRequest } from "@/services/verificationService";
import type { VerificationRequest, VerificationType } from "@/Types/verification";
import type { Vehicle } from "@/Types/vehicle";
import { formatDateTime } from "@/lib/format";
import { Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function VerificationPage() {
  return (
    <RequireAuth>
      <VerificationContent />
    </RequireAuth>
  );
}

function VerificationContent() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<Extract<VerificationType, "identity" | "vehicle_ownership">>("identity");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setLoadError("");
    try {
      const [userRequests, ownedVehicles] = await Promise.all([
        getVerificationRequests(),
        getMyListings(),
      ]);
      setRequests(userRequests);
      setVehicles(ownedVehicles);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Verification information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    if (type === "vehicle_ownership" && !vehicleId) {
      toast.error("Choose the vehicle you want reviewed.");
      return;
    }

    setSubmitting(true);
    try {
      await submitVerificationRequest({
        type,
        ...(type === "vehicle_ownership" ? { vehicleId } : {}),
        notes,
      });
      toast.success("Review request submitted.");
      setNotes("");
      setVehicleId("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 lg:px-6">
        <header className="flex items-center gap-3">
          <ShieldCheck className="text-[#0B5D3B]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Verification requests</p>
            <h1 className="text-4xl font-bold">Request a review</h1>
          </div>
        </header>

        <p className="max-w-3xl text-gray-600">
          Submit an identity or vehicle ownership review request. These requests are reviewed by an administrator;
          submission does not automatically verify your identity or vehicle.
        </p>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Document uploads and external identity or vehicle history checks are not available in this workflow.
          Do not include sensitive identity numbers or private documents in the notes.
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold">
              Review type
              <select
                className="input mt-2"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as typeof type);
                  setVehicleId("");
                }}
              >
                <option value="identity">Identity review</option>
                <option value="vehicle_ownership">Vehicle ownership review</option>
              </select>
            </label>

            {type === "vehicle_ownership" ? (
              <label className="block text-sm font-semibold">
                Your vehicle
                <select
                  className="input mt-2"
                  required
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">Choose a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
                {vehicles.length === 0 ? (
                  <span className="mt-2 block text-xs font-normal text-gray-600">
                    No vehicles are available in your seller inventory. Create a listing first.
                  </span>
                ) : null}
              </label>
            ) : null}

            <label className="block text-sm font-semibold">
              Note for the reviewer
              <textarea
                className="input mt-2 min-h-36"
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context for the administrator reviewing your request."
              />
              <span className="mt-1 block text-right text-xs font-normal text-gray-500">{notes.length}/2000</span>
            </label>

            <button
              type="submit"
              disabled={submitting || (type === "vehicle_ownership" && (vehicles.length === 0 || !vehicleId))}
              className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : null}
              Submit review request
            </button>
          </form>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm" aria-labelledby="request-history-title">
            <h2 id="request-history-title" className="text-2xl font-bold">Your recent requests</h2>
            <p className="mt-1 text-xs text-gray-500">Showing the latest 100 requests.</p>
            {loadError ? (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <p>{loadError}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>Try again</button>
              </div>
            ) : loading ? (
              <div className="flex min-h-48 items-center justify-center" aria-live="polite">
                <Loader2 className="animate-spin text-[#0B5D3B]" size={28} aria-hidden="true" />
                <span className="sr-only">Loading verification requests</span>
              </div>
            ) : requests.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No verification requests yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-2xl bg-[#F8F9FA] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{request.type === "vehicle_ownership" ? "Vehicle ownership" : request.type === "identity" ? "Identity" : "Vehicle history"}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-medium capitalize text-gray-700">{request.status.replaceAll("_", " ")}</span>
                    </div>
                    {request.vehicleId ? <p className="mt-2 break-all text-xs text-gray-500">Vehicle ID: {request.vehicleId}</p> : null}
                    {request.submittedAt ? <p className="mt-2 text-xs text-gray-500">Submitted {formatDateTime(request.submittedAt)}</p> : null}
                    {request.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{request.notes}</p> : null}
                    {request.rejectionReason ? <p className="mt-2 text-sm text-red-700">{request.rejectionReason}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

