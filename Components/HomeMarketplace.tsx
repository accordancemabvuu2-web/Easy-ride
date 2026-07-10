"use client";

import { getActiveListings } from "@/services/listingService";
import type { ListingType, Vehicle } from "@/Types/vehicle";
import {
  Grid2x2,
  LayoutList,
  Loader2,
  Map,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CarCard from "@/Components/CarCard";

type FilterType = ListingType | "all";
type ViewMode = "grid" | "list";
type SortType = "featured" | "price-asc" | "price-desc" | "year-desc";

const pageSize = 3;

export default function HomeMarketplace() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<FilterType>("all");
  const [location, setLocation] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [sortBy, setSortBy] = useState<SortType>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        const result = await getActiveListings();
        setVehicles(result);
      } catch (error) {
        console.error("Could not load listings:", error);
      } finally {
        setLoadingVehicles(false);
      }
    }

    loadVehicles();
  }, []);

  useEffect(() => {
    const urlType = searchParams.get("type");
    const urlSearch = searchParams.get("q") ?? "";

    if (urlType === "buy" || urlType === "rent" || urlType === "all") {
      setListingType(urlType);
    } else {
      setListingType("all");
    }

    setSearch(urlSearch);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, listingType, location, fuelType, transmission, sortBy]);

  const locations = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.location.city))],
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    const nextVehicles = vehicles.filter((vehicle) => {
      const searchable = [
        vehicle.make,
        vehicle.model,
        vehicle.location.city,
        vehicle.location.address,
        vehicle.ownerName,
        vehicle.ownerEmail,
        vehicle.sellerType,
        vehicle.fuelType,
        vehicle.transmission,
        vehicle.bodyType ?? "",
        vehicle.color ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        (listingType === "all" || vehicle.listingType === listingType) &&
        (location === "all" || vehicle.location.city === location) &&
        (fuelType === "all" || vehicle.fuelType === fuelType) &&
        (transmission === "all" || vehicle.transmission === transmission) &&
        (!term || searchable.includes(term))
      );
    });

    return [...nextVehicles].sort((left, right) => {
      if (sortBy === "price-asc") return left.price - right.price;
      if (sortBy === "price-desc") return right.price - left.price;
      if (sortBy === "year-desc") return right.year - left.year;

      if (left.featured !== right.featured) {
        return left.featured ? -1 : 1;
      }

      return right.updatedAt?.localeCompare(left.updatedAt ?? "") ?? 0;
    });
  }, [fuelType, listingType, location, search, sortBy, transmission, vehicles]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const visibleVehicles = filteredVehicles.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearFilters = () => {
    setSearch("");
    setListingType("all");
    setLocation("all");
    setFuelType("all");
    setTransmission("all");
    setSortBy("featured");
    setViewMode("grid");
    setPage(1);
  };

  const hasFilters =
    search ||
    listingType !== "all" ||
    location !== "all" ||
    fuelType !== "all" ||
    transmission !== "all" ||
    sortBy !== "featured";

  if (loadingVehicles) {
    return (
      <section className="mx-auto flex min-h-96 max-w-7xl items-center justify-center px-4 lg:px-6">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
      </section>
    );
  }

  return (
    <section id="vehicles" className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-6">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-4 lg:col-span-2">
            <Search size={18} className="text-[#0B5D3B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="Search brand, model, location, dealer..."
              aria-label="Search vehicles"
            />
          </label>

          <select
            value={listingType}
            onChange={(event) => setListingType(event.target.value as FilterType)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
            aria-label="Listing type"
          >
            <option value="all">All listings</option>
            <option value="buy">For sale</option>
            <option value="rent">For rent</option>
          </select>

          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
            aria-label="Location filter"
          >
            <option value="all">All locations</option>
            {locations.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={fuelType}
            onChange={(event) => setFuelType(event.target.value)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
            aria-label="Fuel type filter"
          >
            <option value="all">All fuel types</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Electric">Electric</option>
          </select>

          <select
            value={transmission}
            onChange={(event) => setTransmission(event.target.value)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
            aria-label="Transmission filter"
          >
            <option value="all">All transmissions</option>
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortType)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
            aria-label="Sort vehicles"
          >
            <option value="featured">Sort by featured</option>
            <option value="year-desc">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="mr-1 flex items-center gap-2 text-sm font-medium text-gray-500">
            <SlidersHorizontal size={17} />
            View:
          </div>

          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              viewMode === "grid"
                ? "bg-[#0B5D3B] text-white"
                : "border border-[#E5E7EB] bg-white text-gray-700 hover:border-[#0B5D3B]"
            }`}
          >
            <Grid2x2 size={16} />
            Grid
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              viewMode === "list"
                ? "bg-[#0B5D3B] text-white"
                : "border border-[#E5E7EB] bg-white text-gray-700 hover:border-[#0B5D3B]"
            }`}
          >
            <LayoutList size={16} />
            List
          </button>

          <Link
            href="/map"
            className="inline-flex items-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-2.5 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#0B5D3B] hover:text-white"
          >
            <Map size={16} />
            Map View
          </Link>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-sm font-semibold text-[#0B5D3B]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Marketplace
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Explore available vehicles
          </h2>
        </div>

        <p className="text-sm text-gray-500">
          {filteredVehicles.length}{" "}
          {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}
        </p>
      </div>

      {visibleVehicles.length > 0 ? (
        <div
          className={`mt-7 gap-6 ${
            viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3" : "grid"
          }`}
        >
          {visibleVehicles.map((vehicle) => (
            <CarCard key={vehicle.id} vehicle={vehicle} layout={viewMode} />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-3xl border border-dashed border-[#D1D5DB] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0B5D3B]/10 text-[#0B5D3B]">
            <Search />
          </div>

          <h3 className="mt-5 text-xl font-bold">No vehicles found</h3>

          <p className="mx-auto mt-2 max-w-md text-gray-500">
            Try changing your search term, listing type or selected location.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white"
          >
            Reset filters
          </button>
        </div>
      )}

      {filteredVehicles.length > pageSize && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-[#E5E7EB] px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page === totalPages}
              className="rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
