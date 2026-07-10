"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Search, Plus, ShieldCheck } from "lucide-react";

const cars = [
  {
    id: 1,
    type: "buy",
    name: "Toyota Axio 2018",
    price: "$8,500",
    location: "Harare",
    image: "https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200",
  },
  {
    id: 2,
    type: "rent",
    name: "Honda Fit 2016",
    price: "$35/day",
    location: "Bulawayo",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200",
  },
  {
    id: 3,
    type: "buy",
    name: "Mazda Demio 2017",
    price: "$6,200",
    location: "Mutare",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200",
  },
];

type FilterType = "all" | "buy" | "rent";

export default function Home() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const filteredCars = cars.filter((car) => {
    const matchesType = filter === "all" || car.type === filter;
    const matchesSearch =
      car.name.toLowerCase().includes(search.toLowerCase()) ||
      car.location.toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0B5D3B]">Easy Ride</h1>
          <button className="rounded-full bg-[#0B5D3B] px-5 py-2 text-white font-medium">
            Post Car
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[28px] bg-[#0B5D3B] text-white p-8 md:p-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <ShieldCheck size={16} /> Trusted vehicle marketplace
          </span>

          <h2 className="mt-6 max-w-3xl text-4xl md:text-6xl font-bold leading-tight">
            Find, rent, or sell cars with confidence.
          </h2>

          <p className="mt-4 max-w-2xl text-white/80">
            Easy Ride helps buyers, renters, sellers, and dealers connect faster
            using clean listings, location discovery, and direct contact.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button className="rounded-full bg-[#C9A227] px-6 py-3 font-semibold text-[#121212]">
              Browse Cars
            </button>
            <button className="rounded-full border border-white/30 px-6 py-3 font-semibold">
              List Your Car
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-3 rounded-xl bg-[#F8F9FA] px-4 py-3">
            <Search className="text-gray-500" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="Search by make, model, city..."
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { label: "All", value: "all" },
              { label: "Buy", value: "buy" },
              { label: "Rent", value: "rent" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value as FilterType)}
                className={`rounded-full px-5 py-2 ${
                  filter === item.value
                    ? "bg-[#0B5D3B] text-white"
                    : "border border-[#E5E7EB]"
                }`}
              >
                {item.label}
              </button>
            ))}

            <button className="rounded-full border border-[#E5E7EB] px-5 py-2">
              Map View
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Featured Vehicles</h3>
          <p className="text-sm text-gray-500">
            {filteredCars.length} result{filteredCars.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => (
            <div
              key={car.id}
              className="overflow-hidden rounded-3xl bg-white border border-[#E5E7EB] shadow-sm"
            >
              <div className="relative h-56 w-full">
                <Image
                  src={car.image}
                  alt={car.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>

              <div className="p-5">
                <div className="flex justify-between gap-3">
                  <h4 className="font-bold text-lg">{car.name}</h4>
                  <span className="rounded-full bg-[#C9A227]/20 px-3 py-1 text-sm font-semibold text-[#7A620F]">
                    {car.type === "buy" ? "Buy" : "Rent"}
                  </span>
                </div>

                <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                  {car.price}
                </p>

                <p className="mt-2 flex items-center gap-2 text-gray-600">
                  <MapPin size={17} /> {car.location}
                </p>

                <button className="mt-5 w-full rounded-full bg-[#0B5D3B] py-3 text-white font-semibold">
                  View Details
                </button>
              </div>
            </div>
          ))}

          {filteredCars.length === 0 && (
            <div className="rounded-3xl bg-white border border-[#E5E7EB] p-8 text-center sm:col-span-2 lg:col-span-3">
              <p className="font-semibold">No cars found</p>
              <p className="mt-2 text-gray-500">
                Try another search or filter.
              </p>
            </div>
          )}
        </div>
      </section>

      <button className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A227] text-[#121212] shadow-lg">
        <Plus />
      </button>
    </main>
  );
}
