"use client";

import CarCard from "@/Components/CarCard";
import VehicleFilters from "@/Components/VehicleFilters";
import { getActiveListingPage } from "@/services/listingService";
import type { ListingType, Vehicle } from "@/Types/vehicle";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocumentSnapshot } from "firebase/firestore";
import type { Dispatch, SetStateAction } from "react";

type FilterType = ListingType | "all";
type ViewMode = "grid" | "list";
type SortType = "featured" | "price-asc" | "price-desc" | "year-desc";

export default function HomeMarketplace() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDocument, setLastDocument] = useState<DocumentSnapshot | null>(null);
  const search = searchParams.get("q") ?? "";
  const urlType = searchParams.get("type");
  const listingType: FilterType =
    urlType === "buy" || urlType === "rent" || urlType === "all" ? urlType : "all";
  const [location, setLocation] = useState("all");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [sortBy, setSortBy] = useState<SortType>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    async function loadInitialPage() {
      try {
        setLoadingVehicles(true);
        const page = await getActiveListingPage();
        setVehicles(page.listings);
        setLastDocument(page.lastDocument);
        setHasMore(Boolean(page.lastDocument));
      } catch (error) {
        console.error("Could not load listings:", error);
      } finally {
        setLoadingVehicles(false);
      }
    }

    void loadInitialPage();
  }, []);

  const updateSearchParams = (key: "q" | "type", value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && !(key === "type" && value === "all")) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setSearch: Dispatch<SetStateAction<string>> = (value) => {
    updateSearchParams("q", typeof value === "function" ? value(search) : value);
  };
  const setListingType: Dispatch<SetStateAction<FilterType>> = (value) => {
    updateSearchParams(
      "type",
      typeof value === "function" ? value(listingType) : value,
    );
  };

  const loadMore = async () => {
    if (!lastDocument || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const page = await getActiveListingPage(lastDocument ?? undefined);
      setVehicles((current) => [...current, ...page.listings]);
      setLastDocument(page.lastDocument);
      setHasMore(Boolean(page.lastDocument));
    } catch (error) {
      console.error("Could not load more listings:", error);
    } finally {
      setLoadingMore(false);
    }
  };

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
        vehicle.location.country,
        vehicle.ownerName,
        vehicle.ownerEmail,
        vehicle.ownerPhone,
        vehicle.sellerType,
        vehicle.fuelType,
        vehicle.transmission,
        vehicle.bodyType ?? "",
        vehicle.color ?? "",
        vehicle.id,
        String(vehicle.year),
        String(vehicle.price),
        String(vehicle.mileage),
        vehicle.listingType,
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

  const clearFilters = () => {
    setSearch("");
    setListingType("all");
    setLocation("all");
    setFuelType("all");
    setTransmission("all");
    setSortBy("featured");
    setViewMode("grid");
  };

  const hasFilters = Boolean(
    search ||
      listingType !== "all" ||
      location !== "all" ||
      fuelType !== "all" ||
      transmission !== "all" ||
      sortBy !== "featured",
  );

  if (loadingVehicles) {
    return (
      <section className="mx-auto flex min-h-96 max-w-7xl items-center justify-center px-4 lg:px-6">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
      </section>
    );
  }

  return (
    <section id="vehicles" className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <VehicleFilters
        search={search}
        setSearch={setSearch}
        listingType={listingType}
        setListingType={setListingType}
        location={location}
        setLocation={setLocation}
        fuelType={fuelType}
        setFuelType={setFuelType}
        transmission={transmission}
        setTransmission={setTransmission}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        locations={locations}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
      />

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Marketplace
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Explore available vehicles
          </h2>
        </div>

        <p className="text-sm text-gray-500 sm:shrink-0">
          {filteredVehicles.length}{" "}
          {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}
        </p>
      </div>

      {filteredVehicles.length > 0 ? (
        <div
          className={`mt-7 gap-6 ${
            viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3" : "grid"
          }`}
        >
          {filteredVehicles.map((vehicle) => (
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

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Loaded {vehicles.length} listings
        </p>

        {hasMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="w-full rounded-full bg-[#0B5D3B] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </section>
  );
}
