"use client";

import Navbar from "@/Components/Navbar";
import PromotionPlanCard from "@/Components/PromotionPlanCard";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { createMockPayment, completeMockPayment } from "@/services/paymentService";
import { createPromotion, getPromotionByListingId, promotionPlans } from "@/services/promotionService";
import { getListingById } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, Megaphone } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function PromotePage() {
  return (
    <RequireAuth>
      <PromoteContent />
    </RequireAuth>
  );
}

function PromoteContent() {
  const { listingId } = useParams<{ listingId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [listing, setListing] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const currentPromotion = useMemo(() => getPromotionByListingId(listingId), [listingId]);

  useEffect(() => {
    async function loadListing() {
      setLoading(true);
      try {
        setListing(await getListingById(listingId));
      } finally {
        setLoading(false);
      }
    }

    void loadListing();
  }, [listingId]);

  const selectPlan = async (planId: (typeof promotionPlans)[number]["id"]) => {
    if (!listing || !profile) return;

    try {
      const promotion = await createPromotion({
        listingId: listing.id,
        ownerId: profile.id,
        plan: planId,
        currency: listing.currency,
      });

      const paymentId = await createMockPayment({
        userId: profile.id,
        purpose: "listing_promotion",
        referenceId: promotion.id,
        amount: promotion.amount,
        currency: promotion.currency,
      });

      await completeMockPayment(paymentId, profile.id);
      toast.success("Promotion activated.");
      router.push(`/vehicle/${listing.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion could not be started.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </div>
      </main>
    );
  }

  if (!listing || listing.ownerId !== profile?.id) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Promotion unavailable</h1>
          <p className="mt-3 text-gray-500">You can only promote your own listing.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex items-center gap-3">
          <Megaphone className="text-[#0B5D3B]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Promote listing
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              {listing.make} {listing.model} {listing.year}
            </h1>
          </div>
        </div>

        {currentPromotion?.active && (
          <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-800">
            This listing already has an active promotion.
          </p>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {promotionPlans.map((plan) => (
            <PromotionPlanCard
              key={plan.id}
              title={plan.label}
              description={plan.description}
              amount={plan.amount}
              durationDays={plan.durationDays}
              currency={listing.currency}
              active={currentPromotion?.plan === plan.id}
              onSelect={() => void selectPlan(plan.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
