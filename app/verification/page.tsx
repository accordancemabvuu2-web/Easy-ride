"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { submitVerificationRequest, getVerificationRequests } from "@/services/verificationService";
import type { VerificationRequest, VerificationType } from "@/Types/verification";
import { filesToDataUrls } from "@/utils/files";
import { Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<VerificationType>("private_seller");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadRequests() {
      if (!profile) return;
      try {
        setLoading(true);
        const result = await getVerificationRequests();
        setRequests(result.filter((request) => request.userId === profile.id));
      } finally {
        setLoading(false);
      }
    }

    void loadRequests();
  }, [profile]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    const form = event.currentTarget;
    const identityFile = (form.elements.namedItem("identity") as HTMLInputElement | null)?.files;
    const businessFile = (form.elements.namedItem("business") as HTMLInputElement | null)?.files;
    const addressFile = (form.elements.namedItem("address") as HTMLInputElement | null)?.files;

    try {
      setSubmitting(true);
      const [identityDocumentUrl] = await filesToDataUrls(identityFile ?? null);
      const [businessDocumentUrl] = await filesToDataUrls(businessFile ?? null);
      const [proofOfAddressUrl] = await filesToDataUrls(addressFile ?? null);

      await submitVerificationRequest({
        userId: profile.id,
        userName: profile.name,
        userEmail: profile.email,
        type,
        notes,
        identityDocumentUrl,
        businessDocumentUrl,
        proofOfAddressUrl,
      });

      toast.success("Verification request submitted.");
      setNotes("");
      const requestsList = await getVerificationRequests();
      setRequests(requestsList.filter((request) => request.userId === profile.id));
    } catch {
      toast.error("Verification request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#0B5D3B]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Verification
            </p>
            <h1 className="text-4xl font-bold">Request verification</h1>
          </div>
        </div>

        <p className="mt-3 max-w-3xl text-gray-500">
          Verify your identity or business to unlock dealer trust features.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm space-y-4">
            <select className="input" value={type} onChange={(e) => setType(e.target.value as VerificationType)}>
              <option value="private_seller">Private seller verification</option>
              <option value="identity">Identity verification</option>
              <option value="dealer">Dealer verification</option>
            </select>
            <textarea
              className="input min-h-[140px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the admin reviewer"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F8F9FA] p-4 text-sm">
                <span className="font-semibold">Identity doc</span>
                <input name="identity" type="file" className="mt-3 block w-full text-sm" />
              </label>
              <label className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F8F9FA] p-4 text-sm">
                <span className="font-semibold">Business doc</span>
                <input name="business" type="file" className="mt-3 block w-full text-sm" />
              </label>
              <label className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F8F9FA] p-4 text-sm">
                <span className="font-semibold">Proof of address</span>
                <input name="address" type="file" className="mt-3 block w-full text-sm" />
              </label>
            </div>
            <button
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              Submit Request
            </button>
          </div>

          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Your requests</h2>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="animate-spin text-[#0B5D3B]" size={28} />
              </div>
            ) : requests.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No verification requests yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="font-semibold">{request.type}</p>
                    <p className="text-sm text-gray-500">{request.status}</p>
                    {request.rejectionReason && (
                      <p className="mt-2 text-sm text-red-700">{request.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
