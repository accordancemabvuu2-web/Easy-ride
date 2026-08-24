"use client";

import { Grid2x2, LayoutList, Map, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

type FilterType = "buy" | "rent" | "all";
type ViewMode = "grid" | "list";
type SortType = "featured" | "price-asc" | "price-desc" | "year-desc";

interface VehicleFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  listingType: FilterType;
  setListingType: (value: FilterType) => void;
  location: string;
  setLocation: (value: string) => void;
  fuelType: string;
  setFuelType: (value: string) => void;
  transmission: string;
  setTransmission: (value: string) => void;
  sortBy: SortType;
  setSortBy: (value: SortType) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  locations: string[];
  hasFilters: boolean;
  clearFilters: () => void;
}

export default function VehicleFilters({
  search,
  setSearch,
  listingType,
  setListingType,
  location,
  setLocation,
  fuelType,
  setFuelType,
  transmission,
  setTransmission,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  locations,
  hasFilters,
  clearFilters,
}: VehicleFiltersProps) {
  return (
    <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-4 sm:col-span-2 lg:col-span-2">
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
          className="min-h-[56px] rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
          aria-label="Listing type"
        >
          <option value="all">All listings</option>
          <option value="buy">For sale</option>
          <option value="rent">For rent</option>
        </select>

        <select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="min-h-[56px] rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
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
          className="min-h-[56px] rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
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
          className="min-h-[56px] rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
          aria-label="Transmission filter"
        >
          <option value="all">All transmissions</option>
          <option value="Automatic">Automatic</option>
          <option value="Manual">Manual</option>
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortType)}
          className="min-h-[56px] rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 outline-none focus:border-[#0B5D3B]"
          aria-label="Sort vehicles"
        >
          <option value="featured">Sort by featured</option>
          <option value="year-desc">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="mr-1 flex items-center gap-2 text-sm font-medium text-gray-500">
          <SlidersHorizontal size={17} />
          View:
        </div>

        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition sm:w-auto ${
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
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition sm:w-auto ${
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-2.5 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#0B5D3B] hover:text-white sm:w-auto"
        >
          <Map size={16} />
          Map View
        </Link>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-[#0B5D3B] sm:ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
