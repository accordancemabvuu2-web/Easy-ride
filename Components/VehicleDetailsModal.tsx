"use client";

import type { Vehicle } from "@/Types/vehicle";
import { X } from "lucide-react";
import Image from "next/image";

export default function VehicleDetailsModal({ vehicle, onClose, actions }: { vehicle: Vehicle | null; onClose: () => void; actions?: React.ReactNode }) {
  if (!vehicle) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="vehicle-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-[#07543D]">Vehicle details</p><h2 id="vehicle-details-title" className="mt-1 text-2xl font-black">{vehicle.year} {vehicle.make} {vehicle.model}</h2></div><button type="button" onClick={onClose} aria-label="Close vehicle details" className="rounded-full border p-2"><X size={20}/></button></div>
      <div className="relative aspect-[16/9] bg-[#EEF4F0]"><Image src={vehicle.coverImage || vehicle.images?.[0] || "/images/easy-ride-hero.svg"} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 640px"/></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2"><p><span className="block text-xs text-gray-500">Price</span><b className="text-xl">{vehicle.currency} {vehicle.price.toLocaleString()} {vehicle.listingType === "rent" ? `/ ${vehicle.priceLabel ?? "day"}` : ""}</b></p><p><span className="block text-xs text-gray-500">Location</span><b>{vehicle.location.city}, {vehicle.location.country}</b></p><p><span className="block text-xs text-gray-500">Mileage</span><b>{vehicle.mileage.toLocaleString()} km</b></p><p><span className="block text-xs text-gray-500">Fuel / transmission</span><b>{vehicle.fuelType} · {vehicle.transmission}</b></p><p><span className="block text-xs text-gray-500">Body type</span><b>{vehicle.bodyType || "Vehicle"}</b></p><p><span className="block text-xs text-gray-500">Listing</span><b className="capitalize">For {vehicle.listingType}</b></p></div>
      {vehicle.description && <p className="px-5 pb-5 text-sm leading-6 text-gray-600">{vehicle.description}</p>}{actions && <div className="flex flex-wrap gap-2 border-t p-5">{actions}</div>}
    </section>
  </div>;
}
