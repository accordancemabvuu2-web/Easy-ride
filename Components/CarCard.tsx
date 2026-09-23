"use client";

import FavoriteButton from "@/Components/FavoriteButton";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeCheck, Fuel, Gauge, MapPin, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CarCardProps {
  vehicle: Vehicle;
  layout?: "grid" | "list";
}

export default function CarCard({ vehicle, layout = "grid" }: CarCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-US").format(vehicle.price);
  const isList = layout === "list";

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
        isList ? "md:grid md:grid-cols-[320px_1fr]" : ""
      }`}
    >
      <div className={`relative overflow-hidden ${isList ? "h-60 md:h-full" : "h-56"}`}>
        <Link href={`/vehicle/${vehicle.id}`} className="absolute inset-0" aria-label={`View ${vehicle.make} ${vehicle.model} ${vehicle.year}`}>
          <Image
            src={vehicle.coverImage}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </Link>

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#0B5D3B] px-3 py-1 text-xs font-bold text-white">
            {vehicle.listingType === "buy" ? "For Sale" : "For Rent"}
          </span>

          {vehicle.featured && (
            <span className="rounded-full bg-[#C9A227] px-3 py-1 text-xs font-bold text-[#121212]">
              Featured
            </span>
          )}
        </div>

        <div className="absolute right-4 top-4">
          <FavoriteButton listingId={vehicle.id} compact />
        </div>
      </div>

      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#121212]">
              <Link href={`/vehicle/${vehicle.id}`} className="hover:text-[#0B5D3B]">
              {vehicle.make} {vehicle.model} {vehicle.year}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={16} />
              {vehicle.location.city}, {vehicle.location.country}
            </p>
          </div>

          {vehicle.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0B5D3B]/10 px-3 py-1 text-xs font-semibold text-[#0B5D3B]">
              <BadgeCheck size={14} />
              Verified
            </span>
          )}
        </div>

        <p className="mt-4 text-3xl font-bold text-[#0B5D3B]">
          {vehicle.currency} {formattedPrice}
          {vehicle.priceLabel && (
            <span className="text-base font-medium text-gray-500">
              / {vehicle.priceLabel}
            </span>
          )}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-4">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F8F9FA] px-3 py-2">
            <Settings2 size={15} className="text-[#0B5D3B]" />
            {vehicle.transmission}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F8F9FA] px-3 py-2">
            <Fuel size={15} className="text-[#0B5D3B]" />
            {vehicle.fuelType}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F8F9FA] px-3 py-2">
            <Gauge size={15} className="text-[#0B5D3B]" />
            {vehicle.mileage.toLocaleString()} km
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F8F9FA] px-3 py-2">
            <BadgeCheck size={15} className="text-[#0B5D3B]" />
            {vehicle.sellerType}
          </span>
        </div>

        <p className="mt-4 line-clamp-2 leading-7 text-gray-600">
          {vehicle.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-semibold text-gray-600">
            {vehicle.condition}
          </span>

          <Link
            href={`/vehicle/${vehicle.id}`}
            className="rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#084B30]"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
