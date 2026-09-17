"use client";

import { getActiveListings } from "@/services/listingService";
import FavoriteButton from "@/Components/FavoriteButton";
import Footer from "@/Components/Footer";
import type { Vehicle } from "@/Types/vehicle";
import {
  ChevronDown,
  CircleDollarSign,
  Headphones,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type ListingMode = "buy" | "rent";

const categories = ["All Cars", "SUV", "Sedan", "Hatchback", "Truck", "Van", "Coupe"];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ListingMode>("buy");
  const [category, setCategory] = useState("All Cars");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("Current Location");
  const [priceRange, setPriceRange] = useState("$1,000 - $50,000+");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getActiveListings()
      .then((listings) => {
        if (!isMounted) {
          return;
        }

        setVehicles(listings.filter((listing) => listing.status === "active"));
      })
      .catch((error) => {
        console.error("Could not load approved listings for landing page:", error);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingVehicles(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesMode = vehicle.listingType === mode;
      const vehicleCategory = (vehicle.bodyType ?? "").trim();
      const matchesCategory =
        category === "All Cars" ||
        vehicleCategory.toLowerCase() === category.toLowerCase();

      const searchableText = [
        vehicle.make,
        vehicle.model,
        vehicle.bodyType ?? "",
        vehicle.listingType,
        vehicle.transmission,
        vehicle.fuelType,
        vehicle.location?.city ?? "",
        vehicle.location?.country ?? "",
        String(vehicle.price),
        String(vehicle.year),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch === "" || searchableText.includes(normalizedSearch);

      const numericPrice = vehicle.price;
      const matchesPrice =
        priceRange === "$1,000 - $50,000+" ||
        (priceRange === "$1,000 - $5,000" && numericPrice <= 5000) ||
        (priceRange === "$5,000 - $10,000" && numericPrice > 5000 && numericPrice <= 10000) ||
        (priceRange === "$10,000 - $25,000" && numericPrice > 10000 && numericPrice <= 25000) ||
        (priceRange === "$25,000+" && numericPrice > 25000);

      const matchesLocation =
        location === "Current Location" ||
        vehicle.location?.city?.toLowerCase() === location.toLowerCase();

      return matchesMode && matchesCategory && matchesSearch && matchesPrice && matchesLocation;
    });
  }, [category, location, mode, priceRange, search, vehicles]);

  const runSearch = () => {
    document.getElementById("nearby-vehicles")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071612] text-white">
      <section className="relative min-h-[760px] overflow-hidden bg-[#021C17] text-white">
        <div className="absolute inset-0">
          <Image
            src="/images/pexels-tengiz-nichbeli-357823024-19281437.jpg"
            alt="Front view of a premium BMW vehicle"
            fill
            priority
            className="object-cover object-[74%_55%]"
            sizes="100vw"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#001B17] via-[#001B17]/90 to-[#001B17]/22" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001B17] via-transparent to-[#001B17]/45" />

        <header className="relative z-30 w-full">
          <div className="flex h-[72px] w-full items-center justify-between px-5 sm:px-8 lg:px-10 xl:px-14">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image
                  src="/images/Easy_Ride_automotive_logo_design_202609071232.jpeg"
                  alt="Easy Ride logo"
                  fill
                  className="object-contain p-0.5"
                  sizes="44px"
                />
              </div>

              <span className="text-xl font-black tracking-tight">
                EASY
                <span className="text-[#E7B319]">RIDE</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex">
              <a href="#nearby-vehicles" className="hover:text-[#E7B319]">
                Buy
              </a>
              <Link href="/marketplace?type=rent" className="hover:text-[#E7B319]">
                Rent
              </Link>
              <Link href="/create-listing" className="hover:text-[#E7B319]">
                Sell
              </Link>
              <Link href="/support" className="hover:text-[#E7B319]">
                Services
              </Link>
              <button className="flex items-center gap-1 hover:text-[#E7B319]">
                Resources
                <ChevronDown size={15} />
              </button>
              <Link href="/about" className="hover:text-[#E7B319]">
                About
              </Link>
            </nav>

            <div className="hidden items-center gap-4 lg:flex">
              <Link
                href="/login"
                className="text-sm font-semibold transition hover:text-[#E7B319]"
              >
                Log in
              </Link>
              <Link
                href="/create-listing"
                className="rounded-full border border-[#E7B319] bg-[#E7B319] px-5 py-3 text-xs font-bold text-[#102018] transition hover:bg-[#F4C83D]"
              >
                Post Your Car
              </Link>
            </div>

            <button
              type="button"
              aria-label="Toggle mobile navigation"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="rounded-xl border border-white/20 p-2.5 lg:hidden"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="absolute left-4 right-4 top-[68px] rounded-2xl border border-white/10 bg-[#03231D]/95 p-4 shadow-2xl backdrop-blur lg:hidden">
              {[
                ["Buy", "#nearby-vehicles"],
                ["Rent", "/marketplace?type=rent"],
                ["Sell", "/create-listing"],
                ["Services", "/support"],
                ["About", "/about"],
                ["Log in", "/login"],
                ["Favorites", "/favorites"],
                ["Notifications", "/notifications"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 font-semibold hover:bg-white/10"
                >
                  {label}
                </Link>
              ))}

              <Link
                href="/create-listing"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-3 block rounded-xl bg-[#E7B319] px-5 py-3 text-center font-bold text-[#11241D]"
              >
                Post Your Car
              </Link>
            </nav>
          )}
        </header>

        <div className="relative z-20 flex min-h-[688px] flex-col justify-center px-5 pb-44 pt-10 sm:px-8 lg:px-10 xl:px-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1E9A64]/30 bg-[#063F2C]/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6FD5A0] backdrop-blur">
              <ShieldCheck size={16} />
              Trusted by thousands
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-[64px]">
              Find Your Next Car
              <br />
              With <span className="text-[#E7B319]">Confidence.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/75 sm:text-base">
              Buy, sell or rent cars with trusted sellers and real data to make the right decision.
            </p>

            <div className="mt-8 inline-flex rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur">
              <button
                type="button"
                onClick={() => setMode("buy")}
                className={`min-w-28 rounded-full px-7 py-3 text-sm font-bold transition ${
                  mode === "buy"
                    ? "bg-[#08784D] text-white"
                    : "text-white/75 hover:text-white"
                }`}
              >
                Buy
              </button>

              <button
                type="button"
                onClick={() => setMode("rent")}
                className={`min-w-28 rounded-full px-7 py-3 text-sm font-bold transition ${
                  mode === "rent"
                    ? "bg-[#08784D] text-white"
                    : "text-white/75 hover:text-white"
                }`}
              >
                Rent
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="rounded-2xl bg-white p-5 text-[#17201D] shadow-[0_22px_65px_rgba(0,0,0,0.38)]">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end">
              <SearchControl label="What are you looking for?" icon={<Search size={18} />}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      runSearch();
                    }
                  }}
                  placeholder="Search make, model, year, price, type..."
                  className="w-full bg-transparent outline-none"
                />
              </SearchControl>

              <SearchControl label="Location" icon={<MapPin size={18} />}>
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full bg-transparent outline-none"
                >
                  <option>Current Location</option>
                  <option>Harare</option>
                  <option>Bulawayo</option>
                  <option>Mutare</option>
                  <option>Gweru</option>
                </select>
              </SearchControl>

              <SearchControl label="Price Range" icon={<CircleDollarSign size={18} />}>
                <select
                  value={priceRange}
                  onChange={(event) => setPriceRange(event.target.value)}
                  className="w-full bg-transparent outline-none"
                >
                  <option>$1,000 - $50,000+</option>
                  <option>$1,000 - $5,000</option>
                  <option>$5,000 - $10,000</option>
                  <option>$10,000 - $25,000</option>
                  <option>$25,000+</option>
                </select>
              </SearchControl>

              <button
                type="button"
                onClick={runSearch}
                className="h-14 rounded-xl bg-[#E7B319] px-8 font-bold text-[#102018] transition hover:bg-[#F4C83D]"
              >
                Search
              </button>
            </div>
          </div>

        </div>
      </section>

      <section id="nearby-vehicles" className="w-full px-4 py-16 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Browse
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {mode === "buy" ? "Cars For Sale Near You" : "Cars For Rent Near You"}
            </h2>
            <p className="mt-2 text-gray-500">
              Discover great cars {mode === "buy" ? "to buy" : "to rent"} in your area
            </p>
          </div>

          <Link href="/map" className="flex items-center gap-2 text-sm font-bold text-[#08784D]">
            View on Map
            <MapPin size={18} />
          </Link>
        </div>

        <div className="mt-7 flex gap-3 overflow-x-auto pb-3">
          {categories.map((item) => {
            const active = category === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#063F2C] text-white shadow-[0_4px_12px_rgba(6,63,44,0.22)]"
                    : "border border-[#D1DAD5] bg-white text-gray-600 hover:border-[#08784D] hover:text-[#063F2C]"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 pb-6 sm:grid-cols-2 xl:grid-cols-4">
          {filteredVehicles.map((vehicle) => {
            const imageSource = vehicle.coverImage || vehicle.images?.[0] || getVehicleFallbackImage(vehicle);
            const vehicleName = `${vehicle.make} ${vehicle.model}`;

            return (
              <article
                key={vehicle.id}
                className="group relative overflow-hidden rounded-2xl border border-[#D6E0DB] bg-[#FCFEFD] shadow-[0_8px_24px_rgba(0,45,39,0.08)] transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute right-3 top-3 z-10">
                  <FavoriteButton listingId={vehicle.id} compact />
                </div>

                <a href={`/vehicle/${vehicle.id}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4F0]">
                    <Image
                      src={imageSource}
                      alt={vehicleName}
                      fill
                      className="cursor-pointer object-cover transition duration-500 group-hover:scale-105"
                      sizes="255px"
                    />

                  {vehicle.featured && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#168C58] px-3 py-1 text-[11px] font-bold text-white">
                      Great Deal
                    </span>
                  )}

                  {vehicle.verified && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#063F2C] shadow-sm">
                      Verified Seller
                    </span>
                  )}
                </div>

                  <div className="p-4 text-[#121816]">
                    <h3 className="font-bold group-hover:text-[#08784D]">{vehicleName}</h3>

                  <p className="mt-2 text-sm text-gray-500">
                    {vehicle.year} · {vehicle.mileage.toLocaleString()} km · {vehicle.condition}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {vehicle.transmission} · {vehicle.fuelType}
                  </p>

                  <p className="mt-4 text-xl font-black">
                    ${vehicle.price.toLocaleString()}
                    {vehicle.listingType === "rent" && (
                      <span className="ml-1 text-xs font-semibold text-gray-500">
                        {vehicle.priceLabel ? `/${vehicle.priceLabel}` : "/ day"}
                      </span>
                    )}
                  </p>

                    <p className="mt-2 text-sm text-gray-500">{vehicle.location?.city ?? "Local"}</p>
                    <p className="mt-4 text-sm font-bold text-[#08784D]">View details</p>
                  </div>
                </a>
              </article>
            );
          })}

          {!loadingVehicles && filteredVehicles.length === 0 && (
            <div className="flex min-h-64 min-w-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center text-[#121816]">
              <SlidersHorizontal size={34} className="text-gray-400" />
              <h3 className="mt-4 text-xl font-bold">
                No cars available {mode === "buy" ? "for sale" : "for rent"}
              </h3>
              <p className="mt-2 text-gray-500">Change your category or search term.</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-2xl bg-gradient-to-r from-[#003D32] to-[#002D27] text-white sm:grid-cols-2 xl:grid-cols-4">
          <Statistic icon={<CarIcon />} value="12,458+" label="Cars Listed" />
          <Statistic icon={<UserRound size={22} />} value="8,256+" label="Happy Customers" />
          <Statistic icon={<MapPin size={22} />} value="342+" label="Verified Dealers" />
          <Statistic icon={<Headphones size={22} />} value="24/7" label="Support" />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function SearchControl({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium text-gray-500">{label}</span>

      <div className="flex h-14 items-center gap-3 rounded-xl border border-[#D6E0DB] bg-[#F8FBF9] px-4 transition focus-within:border-[#08784D] focus-within:ring-2 focus-within:ring-[#08784D]/15">
        <span className="text-gray-500">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </label>
  );
}

function getVehicleFallbackImage(vehicle: Vehicle) {
  const make = vehicle.make.toLowerCase();

  if (make.includes("toyota")) {
    return "/images/toyota-axio.svg";
  }

  if (make.includes("honda")) {
    return "/images/honda-fit.svg";
  }

  if (make.includes("mazda")) {
    return "/images/mazda-demio.svg";
  }

  if (make.includes("mercedes")) {
    return "/images/mercedes-c200.svg";
  }

  if (make.includes("hilux")) {
    return "/images/toyota-hilux.svg";
  }

  return "/images/easy-ride-hero.svg";
}

function Statistic({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-4 border-white/10 px-6 py-7 xl:border-r xl:last:border-r-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#08784D] text-[#E7B319]">
        {icon}
      </div>

      <div>
        <p className="text-xl font-black">{value}</p>
        <p className="mt-1 text-sm text-white/70">{label}</p>
      </div>
    </div>
  );
}

function CarIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17h14" />
      <path d="M6 17l1-6h10l1 6" />
      <path d="M8 11l1-3h6l1 3" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
