"use client";

import CarCard from "@/Components/CarCard";
import VehicleFilters from "@/Components/VehicleFilters";
import { getActiveListings } from "@/services/listingService";
import type { ListingType, Vehicle } from "@/Types/vehicle";
import { Grid2X2, List, Loader2, Map, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FilterType = ListingType | "all";
type ViewMode = "grid" | "list";
type SortType = "newest" | "price-asc" | "price-desc" | "year-desc" | "year-asc" | "views-desc";

const optionalNumber = (value: string | null) => value ? Number(value) : "";

export default function HomeMarketplace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const search = searchParams.get("q") ?? "";
  const requestedType = searchParams.get("type");
  const listingType: FilterType = requestedType === "buy" || requestedType === "rent" ? requestedType : "all";
  const location = searchParams.get("location") ?? "all";
  const make = searchParams.get("make") ?? "all";
  const model = searchParams.get("model") ?? "all";
  const priceMin = optionalNumber(searchParams.get("priceMin"));
  const priceMax = optionalNumber(searchParams.get("priceMax"));
  const yearMin = optionalNumber(searchParams.get("yearMin"));
  const yearMax = optionalNumber(searchParams.get("yearMax"));
  const mileageMax = optionalNumber(searchParams.get("mileageMax"));
  const bodyType = searchParams.get("bodyType") ?? "all";
  const transmission = searchParams.get("transmission") ?? "all";
  const fuelType = searchParams.get("fuelType") ?? "all";
  const condition = searchParams.get("condition") ?? "all";
  const requestedSort = searchParams.get("sort");
  const sortBy: SortType = requestedSort === "price-asc" || requestedSort === "price-desc" || requestedSort === "year-desc" || requestedSort === "year-asc" || requestedSort === "views-desc" ? requestedSort : "newest";

  useEffect(() => {
    let active = true;
    getActiveListings()
      .then((listings) => {
        if (active) setVehicles(listings.filter((listing) => listing.status === "active"));
      })
      .catch((error) => {
        console.error("Could not load marketplace listings:", error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoadingVehicles(false);
      });
    return () => { active = false; };
  }, []);

  const updateFilter = (key: string, value: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = String(value);
    const defaultValue = key === "sort" ? "newest" : key === "type" ? "all" : "";
    if (!normalized || normalized === defaultValue) params.delete(key);
    else params.set(key, normalized);
    const query = params.toString();
    router.replace(query ? `/marketplace?${query}` : "/marketplace", { scroll: false });
  };

  const locations = useMemo(() => unique(vehicles.map((vehicle) => vehicle.location?.city ?? "")), [vehicles]);
  const makes = useMemo(() => unique(vehicles.map((vehicle) => vehicle.make)), [vehicles]);
  const models = useMemo(() => unique(vehicles.filter((vehicle) => make === "all" || vehicle.make.toLowerCase() === make.toLowerCase()).map((vehicle) => vehicle.model)), [make, vehicles]);
  const bodyTypes = useMemo(() => unique(vehicles.map((vehicle) => vehicle.bodyType ?? "")), [vehicles]);
  const years = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.year))].sort((a, b) => b - a), [vehicles]);

  const filteredVehicles = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = vehicles.filter((vehicle) => {
      const searchable = [
        vehicle.make, vehicle.model, vehicle.location?.city, vehicle.location?.address,
        vehicle.location?.country, vehicle.ownerName, vehicle.sellerType, vehicle.fuelType,
        vehicle.transmission, vehicle.bodyType, vehicle.color, vehicle.condition,
        vehicle.id, vehicle.year, vehicle.price, vehicle.mileage,
      ].join(" ").toLowerCase();
      return (listingType === "all" || vehicle.listingType === listingType)
        && (location === "all" || vehicle.location?.city.toLowerCase() === location.toLowerCase())
        && (make === "all" || vehicle.make.toLowerCase() === make.toLowerCase())
        && (model === "all" || vehicle.model.toLowerCase() === model.toLowerCase())
        && (priceMin === "" || vehicle.price >= priceMin)
        && (priceMax === "" || vehicle.price <= priceMax)
        && (yearMin === "" || vehicle.year >= yearMin)
        && (yearMax === "" || vehicle.year <= yearMax)
        && (mileageMax === "" || vehicle.mileage <= mileageMax)
        && (bodyType === "all" || vehicle.bodyType?.toLowerCase() === bodyType.toLowerCase())
        && (transmission === "all" || vehicle.transmission === transmission)
        && (fuelType === "all" || vehicle.fuelType === fuelType)
        && (condition === "all" || vehicle.condition === condition)
        && terms.every((term) => searchable.includes(term));
    });

    return filtered.sort((left, right) => {
      if (sortBy === "price-asc") return left.price - right.price;
      if (sortBy === "price-desc") return right.price - left.price;
      if (sortBy === "year-desc") return right.year - left.year;
      if (sortBy === "year-asc") return left.year - right.year;
      if (sortBy === "views-desc") return right.views - left.views;
      return (right.createdAt ?? right.updatedAt ?? "").localeCompare(left.createdAt ?? left.updatedAt ?? "");
    });
  }, [bodyType, condition, fuelType, listingType, location, make, mileageMax, model, priceMax, priceMin, search, sortBy, transmission, vehicles, yearMax, yearMin]);

  const clearFilters = () => {
    setViewMode("grid");
    router.replace("/marketplace", { scroll: false });
  };

  const hasFilters = searchParams.size > 0;
  const selectedType: FilterType = listingType === "buy" || listingType === "rent" ? listingType : "all";

  return (
    <>
      <section className="bg-gradient-to-br from-[#eff6ff] via-white to-[#f4f8ff]">
        <div className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-10 xl:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0B5D3B]">Easy Ride Marketplace</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Find Your Next Ride</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Browse vehicles from trusted sellers and dealers. Search the whole marketplace and narrow your results to find the right vehicle.</p>
          <label className="mt-7 flex min-h-14 max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-[#0B5D3B] focus-within:ring-4 focus-within:ring-emerald-100">
            <Search size={20} className="shrink-0 text-[#0B5D3B]" />
            <input value={search} onChange={(event) => updateFilter("q", event.target.value)} className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search make, model, keyword..." aria-label="Search vehicles" />
          </label>
          <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm" aria-label="Listing type">
            {(["all", "buy", "rent"] as const).map((type) => <button key={type} type="button" onClick={() => updateFilter("type", type)} aria-pressed={selectedType === type} className={`rounded-full px-5 py-2.5 text-sm font-semibold capitalize transition ${selectedType === type ? "bg-[#0B5D3B] text-white shadow-sm" : "text-slate-600 hover:text-[#0B5D3B]"}`}>{type === "all" ? "All vehicles" : type === "buy" ? "Buy" : "Rent"}</button>)}
          </div>
        </div>
      </section>

      <section id="vehicles" className="w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
        <div className="grid w-full min-w-0 items-start gap-7 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
          <VehicleFilters
            locations={locations} makes={makes} models={models} bodyTypes={bodyTypes} years={years}
            location={location} make={make} model={model} priceMin={priceMin} priceMax={priceMax}
            yearMin={yearMin} yearMax={yearMax} mileageMax={mileageMax} bodyType={bodyType}
            transmission={transmission} fuelType={fuelType} condition={condition}
            onChange={updateFilter} hasFilters={hasFilters} clearFilters={clearFilters}
          />

          <div className="min-w-0">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0B5D3B]">Vehicle results</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{filteredVehicles.length} {filteredVehicles.length === 1 ? "vehicle" : "vehicles"} found</h2></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"><span className="whitespace-nowrap">Sort:</span><select value={sortBy} onChange={(event) => updateFilter("sort", event.target.value)} className="min-w-0 bg-transparent font-semibold text-slate-800 outline-none" aria-label="Sort vehicles"><option value="newest">Newest</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option><option value="year-desc">Year newest</option><option value="year-asc">Year oldest</option><option value="views-desc">Most viewed</option></select></label>
                <div className="flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Results view">
                  <button type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={`rounded-md p-2 ${viewMode === "grid" ? "bg-emerald-50 text-[#0B5D3B]" : "text-slate-500"}`}><Grid2X2 size={17} /></button>
                  <button type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={`rounded-md p-2 ${viewMode === "list" ? "bg-emerald-50 text-[#0B5D3B]" : "text-slate-500"}`}><List size={17} /></button>
                </div>
                <Link href="/map" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#0B5D3B] px-3 text-sm font-semibold text-[#0B5D3B] transition hover:bg-emerald-50"><Map size={16} />Map View</Link>
              </div>
            </div>

            {loadingVehicles ? <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="animate-spin text-[#0B5D3B]" size={32} /></div>
              : loadError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">Marketplace listings could not be loaded. Please try again later.</div>
              : filteredVehicles.length ? <div className={`grid min-w-0 gap-5 ${viewMode === "grid" ? "sm:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1"}`}>{filteredVehicles.map((vehicle) => <CarCard key={vehicle.id} vehicle={vehicle} layout={viewMode} />)}</div>
              : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0B5D3B]"><Search /></div><h3 className="mt-5 text-xl font-bold text-slate-900">No vehicles found</h3><p className="mx-auto mt-2 max-w-md text-slate-500">Try a broader search or clear some filters to see more listings.</p><button type="button" onClick={clearFilters} className="mt-6 rounded-lg bg-[#0B5D3B] px-5 py-3 font-semibold text-white hover:bg-[#084B30]">Clear filters</button></div>}
          </div>
        </div>
      </section>
    </>
  );
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
