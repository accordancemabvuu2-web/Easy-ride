"use client";

import AvailabilityCalendar from "@/Components/AvailabilityCalendar";
import BookingForm from "@/Components/BookingForm";
import CarCard from "@/Components/CarCard";
import Footer from "@/Components/Footer";
import FavoriteButton from "@/Components/FavoriteButton";
import MessageSellerModal from "@/Components/MessageSellerModal";
import Navbar from "@/Components/Navbar";
import OfferForm from "@/Components/OfferForm";
import ReportListingModal from "@/Components/ReportListingModal";
import { useAuth } from "@/contexts/AuthContext";
import { recordContactClick, recordListingView } from "@/services/analyticsService";
import { getActiveListings, getListingById } from "@/services/listingService";
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
  const [similarVehicles, setSimilarVehicles] = useState<Vehicle[]>([]);
  const [activePhoto, setActivePhoto] = useState("");
  const [showPhone, setShowPhone] = useState(false);
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
    const vehicleId = vehicle?.id;

    if (!vehicleId) {
      return;
    }

    recordListingView(vehicleId, firebaseUser?.uid).catch(console.error);
  }, [vehicle?.id, firebaseUser?.uid]);

  useEffect(() => {
    let active = true;
    if (!vehicle) return () => { active = false; };

    setActivePhoto(vehicle.coverImage || vehicle.images[0] || "");
    getActiveListings()
      .then((listings) => {
        if (!active) return;
        setSimilarVehicles(
          listings
            .filter((listing) => listing.id !== vehicle.id && listing.listingType === vehicle.listingType)
            .sort((left, right) => {
              const leftScore = Number(left.make === vehicle.make) + Number(Boolean(vehicle.bodyType && left.bodyType === vehicle.bodyType));
              const rightScore = Number(right.make === vehicle.make) + Number(Boolean(vehicle.bodyType && right.bodyType === vehicle.bodyType));
              return rightScore - leftScore;
            })
            .slice(0, 3),
        );
      })
      .catch((error) => console.error("Could not load similar vehicles:", error));

    return () => { active = false; };
  }, [vehicle]);

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
            href="/marketplace"
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
          href="/marketplace"
          className="text-sm font-semibold text-[#0B5D3B] hover:underline"
        >
          {"←"} Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="relative h-[360px] overflow-hidden rounded-[32px] bg-gray-200 sm:h-[520px]">
              <Image
                src={activePhoto || vehicle.coverImage}
                alt={`${vehicle.make} ${vehicle.model}`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 65vw"
              />
            </div>
            {vehicle.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Vehicle photos">
                {[...new Set([vehicle.coverImage, ...vehicle.images])].map((photo, index) => (
                  <button key={photo} type="button" onClick={() => setActivePhoto(photo)} aria-label={`Show vehicle photo ${index + 1}`} aria-pressed={activePhoto === photo} className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${activePhoto === photo ? "border-[#0B5D3B]" : "border-transparent"}`}>
                    <Image src={photo} alt={`${vehicle.make} ${vehicle.model} photo ${index + 1}`} fill sizes="112px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <article className="rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
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

            {vehicle.listingType === "rent" && (
              <AvailabilityCalendar listingId={vehicle.id} />
            )}
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
              <p className="mt-1 font-bold">{vehicle.ownerName}</p>
              <p className="mt-0.5 text-sm text-gray-500">{vehicle.sellerType}</p>
              <Link href={`/seller/${vehicle.ownerId}`} className="mt-3 inline-flex text-sm font-semibold text-[#0B5D3B] hover:underline">
                View seller profile
              </Link>
            </div>

            <div className="mt-4 flex justify-end">
              <FavoriteButton listingId={vehicle.id} />
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

              {showPhone ? (
                <a href={`tel:${vehicle.ownerPhone}`} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-4 font-bold text-[#0B5D3B]">
                  <Phone size={20} />
                  {vehicle.ownerPhone}
                </a>
              ) : (
                <button type="button" onClick={() => setShowPhone(true)} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-4 font-bold text-[#0B5D3B]">
                  <Phone size={20} />
                  Show phone number
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <ReportListingModal vehicle={vehicle} />
              <span className="text-xs text-gray-500">
                Help us keep the marketplace safe
              </span>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vehicle.location.latitude},${vehicle.location.longitude}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-4 text-sm font-semibold text-[#0B5D3B] hover:bg-emerald-50"
            >
              View location on Google Maps · {vehicle.location.city}, {vehicle.location.country}
            </a>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              Never send money before inspecting the vehicle and confirming the seller&apos;s identity.
            </p>

            <div className="mt-6 space-y-4">
              {vehicle.listingType === "rent" && <BookingForm vehicle={vehicle} />}
              {vehicle.listingType === "buy" && <OfferForm vehicle={vehicle} />}
            </div>
          </aside>
        </div>

        {similarVehicles.length > 0 && (
          <div className="mt-14">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0B5D3B]">Keep exploring</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Similar vehicles</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {similarVehicles.map((similarVehicle) => <CarCard key={similarVehicle.id} vehicle={similarVehicle} />)}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
