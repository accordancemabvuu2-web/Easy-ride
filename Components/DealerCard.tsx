"use client";

import type { Dealer } from "@/Types/dealer";
import VerificationBadge from "@/Components/VerificationBadge";

export default function DealerCard({ dealer }: { dealer: Dealer }) {
  return (
    <article className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{dealer.businessName}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {dealer.city}, {dealer.country}
          </p>
        </div>
        <VerificationBadge verified={dealer.verified} />
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-7 text-gray-600">
        {dealer.description}
      </p>

      <div className="mt-5 grid gap-2 text-sm text-gray-600">
        <p><b>Phone:</b> {dealer.phone}</p>
        <p><b>WhatsApp:</b> {dealer.whatsapp}</p>
        <p><b>Listings:</b> {dealer.activeListings}</p>
      </div>
    </article>
  );
}
