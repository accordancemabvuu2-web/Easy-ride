"use client";

import DealerSidebar from "@/Components/DealerSidebar";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyDealerProfile,
  submitDealerApplication,
} from "@/services/dealerApiService";
import type { Dealer } from "@/Types/dealer";
import { Loader2, Store } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function DealerProfilePage() {
  return (
    <RequireAuth>
      <RoleGuard
        allowedRoles={["buyer", "seller", "dealer"]}
        allowDealerApplicant
        label="Dealer application"
      >
        <DealerProfileContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function DealerProfileContent() {
  const { profile, isPendingDealer, refreshUser } = useAuth();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!profile) {
      setLoading(false);
      return;
    }

    getMyDealerProfile()
      .then((result) => {
        if (active) setDealer(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error
            ? error.message
            : "The dealer profile could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    const formData = new FormData(event.currentTarget);
    const businessName = String(formData.get("businessName") ?? "").trim();
    if (businessName.length < 2) {
      toast.error("Enter a business name.");
      return;
    }

    try {
      setSubmitting(true);
      const application = await submitDealerApplication(
        {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        },
        {
          businessName,
          businessRegistrationNumber: String(formData.get("registrationNumber") ?? ""),
          contactEmail: String(formData.get("email") ?? ""),
          contactPhone: String(formData.get("phone") ?? ""),
          address: String(formData.get("address") ?? ""),
          description: String(formData.get("description") ?? ""),
        },
      );
      setDealer(application);
      toast.success("Dealer application submitted for review.");
      void refreshUser().catch(() => {
        // The submitted application remains visible here; a later session refresh will update account metadata.
      });
    } catch (error) {
      toast.error(error instanceof Error
        ? error.message
        : "Dealer profile could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasApplication = Boolean(dealer) || isPendingDealer;
  const statusLabel = dealer?.status ?? (isPendingDealer ? "pending" : "not submitted");

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] lg:px-6">
        <DealerSidebar />

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Store className="text-[#0B5D3B]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Dealer profile
              </p>
              <h1 className="text-4xl font-bold">Dealership application</h1>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-gray-600">
            Submit your business information for administrator review. Approved dealer privileges remain unavailable until the backend records approval.
          </p>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center" aria-live="polite">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={28} aria-hidden="true" />
              <span className="sr-only">Loading dealer profile</span>
            </div>
          ) : loadError ? (
            <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              {loadError}
            </div>
          ) : hasApplication ? (
            <section className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm" aria-labelledby="dealer-status-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="dealer-status-heading" className="text-2xl font-bold">
                  {dealer?.businessName ?? "Your dealership application"}
                </h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold capitalize text-amber-900">
                  {statusLabel.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {dealer?.status === "verified"
                  ? "Your dealership is approved. Dealer inventory and team permissions are enforced by the backend."
                  : dealer?.status === "rejected"
                    ? "The application was rejected. Contact support if you need clarification."
                    : "Your application is pending review. You do not need to submit another application."}
              </p>
              {dealer ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business registration</dt>
                    <dd className="mt-1 break-words">{dealer.registrationNumber || "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business contact</dt>
                    <dd className="mt-1 break-all">{dealer.email || "Not supplied"}</dd>
                    <dd className="mt-1">{dealer.phone || "Not supplied"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{dealer.description || "No description supplied."}</dd>
                  </div>
                </dl>
              ) : null}
            </section>
          ) : (
            <form
              onSubmit={submit}
              className="mt-6 grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm lg:grid-cols-2"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Business name <span aria-hidden="true">*</span></span>
                <input name="businessName" required minLength={2} maxLength={160} className="input w-full" autoComplete="organization" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Registration number</span>
                <input name="registrationNumber" maxLength={100} className="input w-full" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Business email</span>
                <input name="email" type="email" maxLength={254} className="input w-full" autoComplete="email" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Business phone</span>
                <input name="phone" type="tel" maxLength={32} className="input w-full" autoComplete="tel" />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-semibold">Business address</span>
                <input name="address" maxLength={500} className="input w-full" autoComplete="street-address" />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-semibold">Business description</span>
                <textarea name="description" maxLength={6000} rows={5} className="input w-full resize-y" />
              </label>
              <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 lg:col-span-2">
                Business document uploads are not available in this application yet. Submit your details for review; no document will be uploaded or stored by this form.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : null}
                {submitting ? "Submitting…" : "Submit dealer application"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
