"use client";

import { landingVehicles } from "@/Data/landingVehicles";
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  CircleDollarSign,
  Headphones,
  Heart,
  LogIn,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type ListingMode = "buy" | "rent";

const categories = ["All Cars", "SUV", "Sedan", "Hatchback", "Truck", "Van", "Coupe"];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ListingMode>("buy");
  const [category, setCategory] = useState("All Cars");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("Current Location");
  const [priceRange, setPriceRange] = useState("$1,000 - $50,000+");

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return landingVehicles.filter((vehicle) => {
      const matchesMode = vehicle.listingType === mode;
      const matchesCategory =
        category === "All Cars" || vehicle.category === category;

      const matchesSearch =
        normalizedSearch === "" ||
        vehicle.name.toLowerCase().includes(normalizedSearch) ||
        vehicle.category.toLowerCase().includes(normalizedSearch) ||
        vehicle.fuel.toLowerCase().includes(normalizedSearch);

      return matchesMode && matchesCategory && matchesSearch;
    });
  }, [category, mode, search]);

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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E7B319] font-black text-[#06382A]">
                ER
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
                className="flex items-center gap-2 text-sm font-semibold transition hover:text-[#E7B319]"
              >
                <LogIn size={18} />
                Log in
              </Link>
              <Link
                href="/favorites"
                aria-label="Favorites"
                className="transition hover:text-[#E7B319]"
              >
                <Heart size={21} />
              </Link>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="transition hover:text-[#E7B319]"
              >
                <Bell size={21} />
              </Link>
              <Link
                href="/create-listing"
                className="flex items-center gap-2 rounded-full border border-[#E7B319] px-4 py-2 text-xs font-bold transition hover:bg-[#E7B319] hover:text-[#102018]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <UserRound size={15} />
                </span>
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

        <div className="absolute right-5 top-32 z-20 hidden w-36 rounded-2xl border border-white/20 bg-white/95 p-4 text-[#17201D] shadow-2xl backdrop-blur sm:right-8 sm:block lg:right-14">
          <p className="text-xs font-semibold text-gray-500">Excellent</p>
          <p className="mt-1 text-lg font-black">4.8 out of 5</p>
          <div className="mt-2 flex gap-0.5 text-[#E7B319]" aria-label="Rated 4.8 out of 5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={13} fill="currentColor" />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Based on 2,458 reviews</p>
          <div className="mt-3 flex -space-x-2">
            {["#0B5D3B", "#E7B319", "#7D8B83", "#24352F"].map((color) => (
              <span
                key={color}
                className="h-6 w-6 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="rounded-2xl bg-white p-5 text-[#17201D] shadow-[0_22px_65px_rgba(0,0,0,0.38)]">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end">
              <SearchControl label="What are you looking for?" icon={<Search size={18} />}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search make, model or type"
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
                className="h-14 rounded-xl bg-[#08784D] px-8 font-bold text-white transition hover:bg-[#05643F]"
              >
                Search
              </button>
            </div>
          </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TrustItem
              icon={<BadgeCheck size={20} />}
              title="Verified Sellers"
              subtitle="Trusted & verified"
            />
            <TrustItem
              icon={<CircleDollarSign size={20} />}
              title="Fair Prices"
              subtitle="Market price insights"
            />
            <TrustItem
              icon={<ShieldCheck size={20} />}
              title="Secure Payments"
              subtitle="Safe & secure"
            />
            <TrustItem
              icon={<Headphones size={20} />}
              title="24/7 Support"
              subtitle="We're here to help"
            />
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
                    ? "bg-[#08784D] text-white"
                    : "border border-[#E2E7E4] bg-white text-gray-600 hover:border-[#08784D]"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-4 overflow-x-auto pb-6">
          {filteredVehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="group min-w-[255px] max-w-[255px] overflow-hidden rounded-2xl border border-[#E5E9E7] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-44 overflow-hidden bg-[#EEF4F0]">
                <Image
                  src={vehicle.image}
                  alt={vehicle.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="255px"
                />

                <button
                  type="button"
                  aria-label={`Save ${vehicle.name}`}
                  className="absolute right-3 top-3 rounded-full bg-white/85 p-2 text-[#0B5D3B] shadow backdrop-blur"
                >
                  <Heart size={18} />
                </button>

                {vehicle.featured && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#168C58] px-3 py-1 text-[11px] font-bold text-white">
                    Great Deal
                  </span>
                )}
              </div>

              <div className="p-4 text-[#121816]">
                <h3 className="font-bold">{vehicle.name}</h3>

                <p className="mt-2 text-sm text-gray-500">
                  {vehicle.transmission} • {vehicle.fuel}
                </p>

                <p className="mt-4 text-xl font-black">
                  ${vehicle.price.toLocaleString()}
                  {vehicle.listingType === "rent" && (
                    <span className="ml-1 text-xs font-semibold text-gray-500">/ day</span>
                  )}
                </p>

                <p className="mt-2 text-sm text-gray-500">{vehicle.distance} km away</p>
              </div>
            </article>
          ))}

          {filteredVehicles.length === 0 && (
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

      <div className="flex h-14 items-center gap-3 rounded-xl border border-[#E1E5E3] px-4">
        <span className="text-gray-500">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </label>
  );
}

function TrustItem({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#08784D] text-white">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-xs text-white/65">{subtitle}</p>
      </div>
    </div>
  );
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
