"use client";

import Footer from "@/Components/Footer";
import MessageSellerModal from "@/Components/MessageSellerModal";
import Navbar from "@/Components/Navbar";
import ReportListingModal from "@/Components/ReportListingModal";
import { useAuth } from "@/contexts/AuthContext";
import { recordContactClick, recordListingView } from "@/services/analyticsService";
import { getListingById } from "@/services/listingService";
import { createWhatsAppUrl } from "@/utils/whatsapp";
import type { Vehicle } from "@/Types/vehicle";
import {
  BadgeCheck,
  Fuel,
  Gauge,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Settings2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const { profile, firebaseUser } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVehicle() {
      try {
        setLoading(true);
        const listing = await getListingById(id);

        if (
          !listing ||
          (listing.status !== "active" &&
            listing.ownerId !== profile?.id &&
            profile?.role !== "admin")
        ) {
          setVehicle(null);
          return;
        }

        setVehicle(listing);
      } finally {
        setLoading(false);
      }
    }

    void loadVehicle();
  }, [id, profile?.id, profile?.role]);

  useEffect(() => {
    if (!vehicle) {
      return;
    }

    recordListingView(vehicle.id, firebaseUser?.uid).catch(console.error);
  }, [vehicle?.id, firebaseUser?.uid]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </div>
        <Footer />
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Listing unavailable</h1>
          <p className="mt-3 text-gray-500">
            This vehicle is not currently available on the public marketplace.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white"
          >
            Back to marketplace
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const formattedPrice = new Intl.NumberFormat("en-US").format(vehicle.price);

  const contactSellerOnWhatsApp = async () => {
    await recordContactClick(
      vehicle.id,
      vehicle.ownerId,
      firebaseUser?.uid,
      "whatsapp",
    );

    const message =
      `Hello ${vehicle.ownerName}, I am interested in your ` +
      `${vehicle.make} ${vehicle.model} ${vehicle.year} listed on Easy Ride.`;

    window.open(
      createWhatsAppUrl(vehicle.ownerPhone, message),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-[#0B5D3B] hover:underline"
        >
          ← Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <div className="relative h-[360px] overflow-hidden rounded-[32px] bg-gray-200 sm:h-[520px]">
              <Image
                src={vehicle.coverImage}
                alt={`${vehicle.make} ${vehicle.model}`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 65vw"
              />
            </div>

            <article className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Vehicle description</h2>
              <p className="mt-4 leading-8 text-gray-600">{vehicle.description}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-[#F8F9FA] p-4">
                  <Settings2 className="text-[#0B5D3B]" />
                  <p className="mt-3 text-sm text-gray-500">Transmission</p>
                  <p className="font-bold">{vehicle.transmission}</p>
                </div>

                <div className="rounded-2xl bg-[#F8F9FA] p-4">
                  <Fuel className="text-[#0B5D3B]" />
                  <p className="mt-3 text-sm text-gray-500">Fuel type</p>
                  <p className="font-bold">{vehicle.fuelType}</p>
                </div>

                <div className="rounded-2xl bg-[#F8F9FA] p-4">
                  <Gauge className="text-[#0B5D3B]" />
                  <p className="mt-3 text-sm text-gray-500">Mileage</p>
                  <p className="font-bold">{vehicle.mileage.toLocaleString()} km</p>
                </div>

                <div className="rounded-2xl bg-[#F8F9FA] p-4">
                  <MapPin className="text-[#0B5D3B]" />
                  <p className="mt-3 text-sm text-gray-500">Location</p>
                  <p className="font-bold">{vehicle.location.city}</p>
                </div>
              </div>
            </article>
          </div>

          <aside className="h-fit rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#0B5D3B] px-3 py-1 text-xs font-bold text-white">
                {vehicle.listingType === "buy" ? "For Sale" : "For Rent"}
              </span>

              {vehicle.verified && (
                <span className="flex items-center gap-1 text-sm font-semibold text-[#0B5D3B]">
                  <BadgeCheck size={18} />
                  Verified
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-bold">
              {vehicle.make} {vehicle.model} {vehicle.year}
            </h1>

            <p className="mt-3 flex items-center gap-2 text-gray-500">
              <MapPin size={18} />
              {vehicle.location.city}, {vehicle.location.country}
            </p>

            <p className="mt-7 text-4xl font-bold text-[#0B5D3B]">
              {vehicle.currency} {formattedPrice}
              {vehicle.priceLabel && (
                <span className="ml-1 text-base font-medium text-gray-500">
                  / {vehicle.priceLabel}
                </span>
              )}
            </p>

            <div className="mt-7 rounded-2xl bg-[#F8F9FA] p-4">
              <p className="text-sm text-gray-500">Listed by</p>
              <p className="mt-1 font-bold">{vehicle.sellerType}</p>
            </div>

            <button
              type="button"
              onClick={() => void contactSellerOnWhatsApp()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white hover:bg-[#084B30]"
            >
              <MessageCircle size={20} />
              Contact on WhatsApp
            </button>

            <div className="mt-3 grid gap-3">
              <MessageSellerModal vehicle={vehicle} />

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-4 font-bold text-[#0B5D3B]"
              >
                <Phone size={20} />
                Show phone number
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <ReportListingModal vehicle={vehicle} />
              <span className="text-xs text-gray-500">
                Help us keep the marketplace safe
              </span>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              Never send money before inspecting the vehicle and confirming the seller&apos;s identity.
            </p>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
