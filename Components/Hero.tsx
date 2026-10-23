"use client";

import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const brands = ["Toyota", "Honda", "Mazda", "BMW", "Ford", "Mercedes-Benz"];

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const trimmed = query.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}#vehicles` : "/#vehicles");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
      <div className="relative overflow-hidden rounded-[32px] bg-[#0B5D3B] px-6 py-12 text-white md:px-12 md:py-16">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C9A227]/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
            <ShieldCheck size={17} />
            Trusted vehicle marketplace
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
            Find your next ride with confidence.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Buy, rent or showcase vehicles through trusted listings,
            location-based discovery and direct contact with sellers.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="flex items-center gap-3 rounded-full bg-white px-5 py-4 text-[#202124] shadow-lg shadow-black/10">
              <Search size={18} className="text-[#0B5D3B]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                  }
                }}
                className="w-full bg-transparent outline-none"
                placeholder="Search Toyota, Harare, Dealer..."
                aria-label="Search vehicles"
              />
            </label>

            <button
              type="button"
              onClick={submitSearch}
              className="flex items-center justify-center gap-2 rounded-full bg-[#C9A227] px-6 py-4 font-bold text-[#121212] transition hover:bg-[#B58F1E]"
            >
              Browse Cars
              <ArrowRight size={18} />
            </button>

            <Link
              href="/?type=rent#vehicles"
              className="flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Rent Cars
            </Link>

            <Link
              href="/create-listing"
              className="flex items-center justify-center rounded-full px-6 py-4 font-semibold text-white/90 transition hover:bg-white/10"
            >
              Post Listing
            </Link>
          </div>

          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/15 pt-7">
            <div>
              <p className="text-2xl font-bold">1,200+</p>
              <p className="mt-1 text-sm text-white/60">Vehicles</p>
            </div>

            <div>
              <p className="text-2xl font-bold">340+</p>
              <p className="mt-1 text-sm text-white/60">Verified sellers</p>
            </div>

            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="mt-1 text-sm text-white/60">Cities covered</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Popular brands
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {brands.map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 flex items-center gap-2 text-sm text-white/65">
          <MapPin size={16} />
          Search by city, dealer, make or transmission to quickly explore listings.
        </div>
      </div>
    </section>
  );
}
