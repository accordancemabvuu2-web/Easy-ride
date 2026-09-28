"use client";

import FavoriteButton from "@/Components/FavoriteButton";
import Footer from "@/Components/Footer";
import type { Vehicle } from "@/Types/vehicle";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  CarFront,
  ChevronDown,
  Fuel,
  Gauge,
  Headphones,
  MapPin,
  Menu,
  MessageSquareMore,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type ListingMode = "buy" | "rent";

const locations = ["All Locations", "Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo"];

const featureCards = [
  {
    title: "Verified Sellers",
    description: "Identity and listing verification where applicable.",
    icon: BadgeCheck,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Buy With Confidence",
    description: "Clear vehicle information and seller details.",
    icon: ShieldCheck,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "Flexible Buying & Renting",
    description: "Purchase or rent vehicles through one platform.",
    icon: ArrowRight,
    tone: "bg-emerald-50 text-[#084B30]",
  },
  {
    title: "Discover More Vehicles",
    description: "Explore cars, SUVs, pickups, motorcycles and more.",
    icon: Car,
    tone: "bg-amber-50 text-amber-700",
  },
];

const steps = [
  { title: "Search & Explore", description: "Browse our wide selection and find what suits your needs.", icon: Search },
  { title: "Contact Seller", description: "Ask questions and arrange a viewing or test drive.", icon: MessageSquareMore },
  { title: "Make It Official", description: "Complete your purchase or rental securely through our platform.", icon: ShieldCheck },
  { title: "Hit the Road", description: "Get your keys and enjoy your new ride.", icon: CarFront },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<ListingMode>("buy");
  const [location, setLocation] = useState("All Locations");
  const [make, setMake] = useState("Any Make");
  const [model, setModel] = useState("Any Model");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    let active = true;
    import("@/services/listingService")
      .then(({ getActiveListings }) => getActiveListings())
      .then((listings) => {
        if (active) setVehicles(listings.filter((listing) => listing.status === "active"));
      })
      .catch((error) => console.error("Could not load approved listings:", error))
      .finally(() => {
        if (active) setLoadingVehicles(false);
      });
    return () => { active = false; };
  }, []);

  const makes = useMemo(() => ["Any Make", ...new Set(vehicles.map((vehicle) => vehicle.make).sort())], [vehicles]);
  const models = useMemo(() => ["Any Model", ...new Set(vehicles.filter((vehicle) => make === "Any Make" || vehicle.make === make).map((vehicle) => vehicle.model).sort())], [make, vehicles]);
  const featuredVehicles = useMemo(() => {
    const seenListings = new Set<string>();
    return vehicles.filter((vehicle) => {
      if (vehicle.listingType !== mode) return false;
      const identity = [vehicle.ownerId, vehicle.year, vehicle.make, vehicle.model]
        .map((part) => String(part).trim().toLowerCase().replace(/\s+/g, " "))
        .join(":");
      if (seenListings.has(identity)) return false;
      seenListings.add(identity);
      return true;
    }).slice(0, 4);
  }, [mode, vehicles]);
  const marketplaceHref = mode === "buy" ? "/marketplace?type=buy" : "/marketplace?type=rent";

  const browseVehicles = () => {
    const query = new URLSearchParams({ type: mode === "buy" ? "buy" : "rent" });
    if (location !== "All Locations") query.set("location", location);
    if (make !== "Any Make") query.set("make", make);
    if (model !== "Any Model") query.set("model", model);
    window.location.href = `/marketplace?${query.toString()}#vehicles`;
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/15 bg-transparent text-white">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="Easy Ride home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5D3B] text-white shadow-sm"><CarFront size={27} strokeWidth={2.5} /></span>
            <span className="text-[21px] font-bold tracking-tight text-white">Easy <span className="text-emerald-400">Ride</span></span>
          </Link>
          <nav className="hidden h-full items-center gap-8 lg:flex">
            <a href="#home" className="flex h-full items-center border-b-2 border-emerald-400 px-1 text-sm font-semibold text-emerald-300">Home</a>
            <Link href="/marketplace?type=buy" className="text-sm font-medium text-white/90 hover:text-emerald-300">Buy</Link>
            <Link href="/map" className="text-sm font-medium text-white/90 hover:text-emerald-300">Map</Link>
            <Link href="/create-listing" className="text-sm font-medium text-white/90 hover:text-emerald-300">Sell</Link>
            <Link href="/marketplace?type=rent" className="text-sm font-medium text-white/90 hover:text-emerald-300">Rent</Link>
            <Link href="/about" className="text-sm font-medium text-white/90 hover:text-emerald-300">About</Link>
            <Link href="/support" className="text-sm font-medium text-white/90 hover:text-emerald-300">Contact</Link>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Login</Link>
            <Link href="/register" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">Sign Up</Link>
          </div>
          <button type="button" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg border border-white/40 p-2 text-white lg:hidden">
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileMenuOpen && <nav className="absolute left-0 right-0 top-[72px] grid gap-1 border-b border-slate-100 bg-white p-4 shadow-lg lg:hidden">
          {[["Home", "/"], ["Buy", "/marketplace?type=buy"], ["Rent", "/marketplace?type=rent"], ["Map", "/map"], ["Sell", "/create-listing"], ["About", "/about"], ["Contact", "/support"], ["Login", "/login"], ["Sign Up", "/register"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">{label}</Link>)}
        </nav>}
      </header>

      <section id="home" className="relative isolate w-full overflow-hidden bg-[#06110f] text-white">
        <Image src="/images/pexels-dilrubasaricimen-7534335.jpg" alt="Vehicle on an open mountain road" fill priority sizes="100vw" className="-z-20 object-cover object-[62%_58%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#06110f]/95 via-[#06110f]/80 to-[#06110f]/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06110f]/65 via-transparent to-[#06110f]/25" />
        <div className="mx-auto flex min-h-[min(650px,calc(100svh-72px))] w-full max-w-[1440px] flex-col justify-center gap-8 px-4 pb-10 pt-24 sm:px-8 sm:pb-14 sm:pt-28 lg:min-h-[620px] lg:px-12 xl:min-h-[650px]">
          <div className="max-w-[610px]">
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-emerald-400">BUY <span className="px-1">•</span> SELL <span className="px-1">•</span> RENT</p>
            <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-white">Your Next Ride<br /><span className="text-emerald-400">Is Just a Click Away.</span></h1>
            <p className="mt-5 max-w-[450px] text-[15px] leading-6 text-slate-200 sm:text-base">Discover quality vehicles, connect with trusted sellers, and find the perfect ride — whether you’re buying, selling or renting.</p>
          </div>
          <div className="w-full max-w-[920px]">
            <div className="grid w-full grid-cols-1 items-center gap-1 rounded-[1.4rem] border border-white/15 bg-[#06151a]/80 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.35)] backdrop-blur-md min-[480px]:grid-cols-2 min-[480px]:gap-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:rounded-full lg:p-2">
              <SearchSelect label="Location" icon={<MapPin size={17} />} value={location} onChange={setLocation} options={locations} dark />
              <SearchSelect label="Make" icon={<CarFront size={17} />} value={make} onChange={(value) => { setMake(value); setModel("Any Model"); }} options={makes} dark />
              <SearchSelect label="Model" icon={<CarFront size={17} />} value={model} onChange={setModel} options={models} dark />
              <button type="button" onClick={browseVehicles} className="flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-[#032117] transition hover:bg-emerald-400 min-[480px]:col-span-2 lg:col-span-1 lg:min-w-40 lg:rounded-full"><Search size={17} className="shrink-0" /> Search Vehicles <ArrowRight size={15} className="shrink-0" /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["buy", "rent"] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`inline-flex min-h-10 min-w-24 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold capitalize transition ${mode === item ? "border-emerald-500 bg-emerald-500 text-[#032117] shadow-lg shadow-emerald-950/20" : "border-white/25 bg-[#06151a]/50 text-white hover:bg-white/10"}`}><CarFront size={15} />{item}</button>)}
              <span className="mx-1 hidden h-6 border-l border-white/25 sm:block" />
              <Link href="/create-listing" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white/90 transition hover:text-emerald-300">Sell Your Vehicle <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Why choose Easy Ride" className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-slate-100 px-5 py-3 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-4">
          <TrustItem icon={<ShieldCheck />} title="Trusted Sellers" text="Verified dealers & private sellers" />
          <TrustItem icon={<ShieldCheck />} title="Seller Verification" text="Verified badges mark reviewed sellers" />
          <TrustItem icon={<MapPin />} title="Wide Selection" text="Cars, bikes, trucks and more" />
          <TrustItem icon={<Headphones />} title="24/7 Support" text="We’re here to help" />
        </div>
      </section>

      <section id="featured-vehicles" className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0B5D3B]">Featured vehicles</p><h2 className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">Popular Listings</h2></div>
          <Link href={marketplaceHref} className="mb-1 hidden items-center gap-1.5 text-sm font-semibold text-[#0B5D3B] hover:text-[#063F2C] sm:flex">View All Vehicles <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
          {loadingVehicles && Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[330px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
          {!loadingVehicles && featuredVehicles.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><SlidersHorizontal className="mx-auto text-slate-400" /><h3 className="mt-3 font-bold">No vehicles listed {mode === "buy" ? "for sale" : "for rent"} yet</h3><p className="mt-1 text-sm text-slate-500">Try the other listing type or check back soon.</p><Link href={marketplaceHref} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0B5D3B]">Browse marketplace <ArrowRight size={16} /></Link></div>}
        </div>
        <Link href={marketplaceHref} className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#0B5D3B] py-3 text-sm font-bold text-[#0B5D3B] sm:hidden">View All Vehicles <ArrowRight size={16} /></Link>
      </section>

      <section className="bg-[#f5f8fc]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0B5D3B]">How it works</p><h2 className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">Getting Started is Easy</h2>
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ title, description, icon: Icon }, index) => <div key={title} className="relative border-l border-emerald-200 pl-5 first:border-transparent sm:first:border-emerald-200"><div className="mb-4 flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5D3B] text-sm font-bold text-white">{index + 1}</span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-[#0B5D3B]"><Icon size={20} /></span></div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1.5 max-w-[245px] text-sm leading-5 text-slate-500">{description}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0B5D3B]">Taking care of every client</p>
        <h2 className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">Key Features</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, description, icon: Icon, tone }) => <article key={title} className="flex min-h-[150px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}><Icon size={20} strokeWidth={1.8} /></span><h3 className="mt-auto pt-7 text-base font-semibold leading-5 text-slate-900">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-500">{description}</p></article>)}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-slate-950">
        <Image src="/images/pexels-cripsdog-24018795.webp" alt="Open road ready for your next drive" fill sizes="100vw" loading="lazy" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-slate-950/75" />
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div><h2 className="text-2xl font-bold text-white sm:text-[26px]">Ready to Find Your Perfect Ride?</h2><p className="mt-1.5 text-sm text-slate-200">Join drivers finding their next ride with Easy Ride.</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/marketplace?type=buy" className="rounded-lg bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white hover:bg-[#084B30]">Buy a Vehicle</Link><Link href="/marketplace?type=rent" className="rounded-lg border border-white/70 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-slate-900">Rent a Vehicle</Link><Link href="/create-listing" className="rounded-lg border border-white/70 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-slate-900">Sell a Vehicle</Link></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function SearchSelect({ label, icon, value, onChange, options, dark = false }: { label: string; icon: ReactNode; value: string; onChange: (value: string) => void; options: string[]; dark?: boolean }) {
  return <label className={`flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 transition sm:gap-3 lg:px-4 ${dark ? "text-white hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"}`}><span className={`shrink-0 ${dark ? "text-slate-200" : "text-slate-700"}`}>{icon}</span><span className="min-w-0 flex-1"><span className={`block text-[10px] font-medium ${dark ? "text-slate-400" : "text-slate-400"}`}>{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`mt-0.5 block w-full min-w-0 appearance-none truncate bg-transparent text-xs font-semibold outline-none ${dark ? "text-white" : "text-slate-700"}`}><option className="text-slate-900" value={label === "Location" ? "All Locations" : label === "Make" ? "Any Make" : "Any Model"}>{label === "Location" ? "Harare" : label === "Make" ? "Any Make" : "Any Model"}</option>{options.filter((option) => option !== "All Locations" && option !== "Any Make" && option !== "Any Model").map((option) => <option className="text-slate-900" key={option}>{option}</option>)}</select></span><ChevronDown size={14} className={`shrink-0 ${dark ? "text-slate-400" : "text-slate-400"}`} /></label>;
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 px-3 py-3 first:pl-0 last:pr-0 sm:px-5 lg:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0B5D3B]">{icon}</span><span><span className="block text-xs font-bold text-slate-900 sm:text-sm">{title}</span><span className="mt-0.5 hidden text-xs text-slate-500 sm:block">{text}</span></span></div>;
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.coverImage || vehicle.images?.[0] || "/images/easy-ride-hero.svg";
  return <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
    <Link href={`/vehicle/${vehicle.id}`} className="flex h-full flex-col" aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100"><Image src={image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" /><span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white ${vehicle.listingType === "rent" ? "bg-[#0B5D3B]" : "bg-emerald-600"}`}>For {vehicle.listingType === "rent" ? "Rent" : "Sale"}</span></div>
      <div className="flex flex-1 flex-col p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 group-hover:text-[#0B5D3B]">{vehicle.make} {vehicle.model} <span className="font-normal text-slate-500">{vehicle.year}</span></h3>{vehicle.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-[#0B5D3B]"><ShieldCheck size={12} /> Verified</span>}</div><p className="mt-1 text-lg font-bold text-slate-900">{vehicle.currency === "USD" ? "$" : `${vehicle.currency} `}{vehicle.price.toLocaleString()}{vehicle.listingType === "rent" && <span className="text-xs font-medium text-slate-500"> / {vehicle.priceLabel || "day"}</span>}</p><p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{vehicle.location?.city || "Zimbabwe"}, {vehicle.location?.country || "Zimbabwe"}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Gauge size={13} />{vehicle.mileage.toLocaleString()} km</span><span className="flex items-center gap-1"><CarFront size={14} />{vehicle.transmission}</span><span className="flex items-center gap-1"><Fuel size={13} />{vehicle.fuelType}</span><span>{vehicle.bodyType || "Vehicle"}</span></div><span className="mt-auto pt-4 text-sm font-bold text-[#0B5D3B]">View Vehicle <ArrowRight size={15} className="ml-1 inline" /></span></div>
    </Link>
    <span className="absolute right-3 top-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><FavoriteButton listingId={vehicle.id} compact /></span>
  </article>;
}
