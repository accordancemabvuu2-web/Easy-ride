"use client";

import DealerSidebar from "@/Components/DealerSidebar";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import VerificationBadge from "@/Components/VerificationBadge";
import { useAuth } from "@/contexts/AuthContext";
import { createDealerProfile, getDealerByOwner } from "@/services/dealerService";
import { submitVerificationRequest } from "@/services/verificationService";
import type { Dealer } from "@/Types/dealer";
import { filesToDataUrls } from "@/utils/files";
import { Loader2, Store } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function DealerProfilePage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["dealer"]} label="Dealer">
        <DealerProfileContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function DealerProfileContent() {
  const { profile } = useAuth();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadDealer() {
      if (!profile) return;
      try {
        setLoading(true);
        setDealer(await getDealerByOwner(profile.id));
      } finally {
        setLoading(false);
      }
    }

    void loadDealer();
  }, [profile]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    const form = event.currentTarget;
    const businessDoc = (form.elements.namedItem("businessDoc") as HTMLInputElement | null)?.files;

    const formData = new FormData(form);

    try {
      setSubmitting(true);
      const [businessDocumentUrl] = await filesToDataUrls(businessDoc ?? null);

      const payload = await createDealerProfile(profile, {
        businessName: String(formData.get("businessName") ?? ""),
        description: String(formData.get("description") ?? ""),
        registrationNumber: String(formData.get("registrationNumber") ?? ""),
        email: String(formData.get("email") ?? profile.email),
        phone: String(formData.get("phone") ?? profile.phone ?? ""),
        whatsapp: String(formData.get("whatsapp") ?? profile.phone ?? ""),
        website: String(formData.get("website") ?? ""),
        logoUrl: String(formData.get("logoUrl") ?? ""),
        coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
        country: String(formData.get("country") ?? ""),
        latitude: Number(formData.get("latitude") ?? 0),
        longitude: Number(formData.get("longitude") ?? 0),
      });

      await submitVerificationRequest({
        userId: profile.id,
        userName: profile.name,
        userEmail: profile.email,
        type: "dealer",
        notes: `Dealer request for ${payload.businessName}`,
        businessDocumentUrl,
      });

      toast.success("Dealer profile submitted for review.");
      setDealer(payload);
    } catch {
      toast.error("Dealer profile could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] lg:px-6">
        <DealerSidebar />

        <div>
          <div className="flex items-center gap-3">
            <Store className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Dealer profile
              </p>
              <h1 className="text-4xl font-bold">Become a dealer</h1>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-gray-500">
            Submit your business details and documents. Your profile will stay pending until admin review.
          </p>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={28} />
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">Current status</h2>
                  <VerificationBadge verified={dealer?.verified ?? false} />
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  {dealer ? dealer.status : "No dealer profile submitted yet."}
                </p>
              </div>

              <form onSubmit={submit} className="mt-6 grid gap-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm lg:grid-cols-2">
                <input name="businessName" className="input" placeholder="Business name" defaultValue={dealer?.businessName} />
                <input name="registrationNumber" className="input" placeholder="Registration number" defaultValue={dealer?.registrationNumber} />
                <input name="email" className="input" placeholder="Business email" defaultValue={dealer?.email ?? profile?.email} />
                <input name="phone" className="input" placeholder="Business phone" defaultValue={dealer?.phone ?? profile?.phone} />
                <input name="whatsapp" className="input" placeholder="WhatsApp number" defaultValue={dealer?.whatsapp ?? profile?.phone} />
                <input name="website" className="input" placeholder="Website" defaultValue={dealer?.website} />
                <input name="logoUrl" className="input" placeholder="Logo URL" defaultValue={dealer?.logoUrl} />
                <input name="coverImageUrl" className="input" placeholder="Cover image URL" defaultValue={dealer?.coverImageUrl} />
                <input name="address" className="input lg:col-span-2" placeholder="Business address" defaultValue={dealer?.address} />
                <input name="city" className="input" placeholder="City" defaultValue={dealer?.city} />
                <input name="country" className="input" placeholder="Country" defaultValue={dealer?.country} />
                <input name="latitude" className="input" placeholder="Latitude" defaultValue={dealer?.latitude ?? 0} />
                <input name="longitude" className="input" placeholder="Longitude" defaultValue={dealer?.longitude ?? 0} />
                <textarea name="description" className="input min-h-[140px] lg:col-span-2" placeholder="Business description" defaultValue={dealer?.description} />
                <label className="rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F8F9FA] p-4 text-sm lg:col-span-2">
                  <span className="font-semibold">Business registration document</span>
                  <input name="businessDoc" type="file" className="mt-3 block w-full text-sm" />
                </label>
                <button disabled={submitting} className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60 lg:col-span-2">
                  {submitting && <Loader2 className="animate-spin" size={18} />}
                  Submit Dealer Profile
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
