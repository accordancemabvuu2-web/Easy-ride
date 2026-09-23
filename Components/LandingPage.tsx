"use client";

import FavoriteButton from "@/Components/FavoriteButton";
import Footer from "@/Components/Footer";
import type { Vehicle } from "@/Types/vehicle";
import {
  ArrowRight,
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
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type ListingMode = "buy" | "rent";

const locations = ["Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo"];

const featureCards = [
  {
    title: "24-hour car delivery",
    description: "Get your new ride brought to you, wherever you are.",
    icon: Gauge,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "24/7 technical support",
    description: "Our friendly team is here whenever you need a hand.",
    icon: Headphones,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "All models have a premium package",
    description: "Every listing gets the care and detail it deserves.",
    icon: Sparkles,
    tone: "bg-emerald-50 text-[#084B30]",
  },
  {
    title: "Absolute confidentiality",
    description: "Your personal details stay safe at every step.",
    icon: ShieldCheck,
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
  const [location, setLocation] = useState("Harare");
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
  const featuredVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.listingType === mode).slice(0, 4),
    [mode, vehicles],
  );
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
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="Easy Ride home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5D3B] text-white shadow-sm"><CarFront size={27} strokeWidth={2.5} /></span>
            <span className="text-[21px] font-bold tracking-tight text-slate-900">Easy Ride</span>
          </Link>
          <nav className="hidden h-full items-center gap-8 lg:flex">
            <a href="#home" className="flex h-full items-center border-b-2 border-[#0B5D3B] px-1 text-sm font-semibold text-[#0B5D3B]">Home</a>
            <Link href="/marketplace?type=buy" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">Buy</Link>
            <Link href="/map" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">Map</Link>
            <Link href="/create-listing" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">Sell</Link>
            <Link href="/marketplace?type=rent" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">Rent</Link>
            <Link href="/about" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">About</Link>
            <Link href="/support" className="text-sm font-medium text-slate-700 hover:text-[#0B5D3B]">Contact</Link>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Login</Link>
            <Link href="/register" className="rounded-lg bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#084B30]">Sign Up</Link>
          </div>
          <button type="button" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg border border-slate-200 p-2 lg:hidden">
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileMenuOpen && <nav className="absolute left-0 right-0 top-[72px] grid gap-1 border-b border-slate-100 bg-white p-4 shadow-lg lg:hidden">
          {[["Home", "/"], ["Buy", "/marketplace?type=buy"], ["Rent", "/marketplace?type=rent"], ["Map", "/map"], ["Sell", "/create-listing"], ["About", "/about"], ["Contact", "/support"], ["Login", "/login"], ["Sign Up", "/register"]].map(([label, href]) => <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">{label}</Link>)}
        </nav>}
      </header>

      <section id="home" className="relative isolate overflow-hidden bg-[#eff5f1]">
        <Image src="/images/pexels-tengiz-nichbeli-357823024-19281437.jpg" alt="Vehicle ready for your next trip" fill priority sizes="100vw" className="-z-20 object-cover object-[74%_58%] max-sm:object-[65%_58%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7faf8] via-[#f7faf8]/95 to-[#f7faf8]/30 max-sm:via-[#f7faf8]/90 max-sm:to-[#f7faf8]/68" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#eaf3ed]/45 via-transparent to-white/10" />
        <div className="mx-auto grid min-h-[min(560px,calc(100svh-72px))] max-w-[1440px] items-center gap-8 px-5 pb-12 pt-12 sm:min-h-[500px] sm:px-8 sm:py-14 lg:min-h-[520px] lg:grid-cols-[1fr_0.92fr] lg:px-12 xl:min-h-[540px]">
          <div className="max-w-[610px]">
            <p className="mb-4 text-sm font-semibold tracking-wide text-[#0B5D3B]">Buy <span className="px-1 text-emerald-300"></span> Sell <span className="px-1 text-emerald-300">&</span> Rent</p>
            <h1 className="text-[clamp(2.35rem,7vw,3.75rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-slate-900">Your Next Ride<br />Is Just a Click Away</h1>
            <p className="mt-5 max-w-[450px] text-[15px] leading-6 text-slate-600 sm:text-base">Discover quality vehicles, connect with trusted sellers, and find the perfect ride — whether you’re buying, selling or renting.</p>
            <div className="mt-6 inline-flex rounded-full bg-white/85 p-1 shadow-sm ring-1 ring-slate-200/80 sm:mt-7">
              {(["buy", "rent"] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-7 py-2.5 text-sm font-bold capitalize transition ${mode === item ? "bg-[#0B5D3B] text-white shadow-sm" : "text-slate-600 hover:text-[#0B5D3B]"}`}>{item}</button>)}
            </div>
            <Link href="/create-listing" className="ml-3 inline-flex items-center justify-center rounded-full border border-[#0B5D3B]/30 bg-white/80 px-5 py-3 text-sm font-bold text-[#0B5D3B] transition hover:bg-white">Sell Your Vehicle</Link>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
        </div>
        <div className="relative px-4 pb-6 sm:px-8 sm:pb-8 lg:px-12 lg:pb-10">
          <div className="mx-auto grid max-w-[1296px] grid-cols-1 gap-1 rounded-xl border border-slate-200/90 bg-white p-2 shadow-[0_14px_45px_rgba(15,42,74,0.13)] min-[480px]:grid-cols-2 min-[480px]:gap-2 lg:grid-cols-4 lg:gap-1">
            <SearchSelect label="Location" icon={<MapPin size={18} />} value={location} onChange={setLocation} options={["All Locations", ...locations]} />
            <SearchSelect label="Make" icon={<CarFront size={18} />} value={make} onChange={(value) => { setMake(value); setModel("Any Model"); }} options={makes} />
            <SearchSelect label="Model" icon={<CarFront size={18} />} value={model} onChange={setModel} options={models} />
            <button type="button" onClick={browseVehicles} className="flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-lg bg-[#0B5D3B] px-4 text-sm font-bold text-white transition hover:bg-[#084B30] sm:col-span-2 lg:col-span-1 lg:px-5"><Search size={17} className="shrink-0" /> Search Vehicles</button>
          </div>
        </div>
      </section>

      <section aria-label="Why choose Easy Ride" className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-slate-100 px-5 py-5 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-7">
          <TrustItem icon={<ShieldCheck />} title="Trusted Sellers" text="Verified dealers & private sellers" />
          <TrustItem icon={<ShieldCheck />} title="Secure Transactions" text="Safe and reliable payments" />
          <TrustItem icon={<MapPin />} title="Wide Selection" text="Cars, bikes, trucks and more" />
          <TrustItem icon={<Headphones />} title="24/7 Support" text="We’re here to help" />
        </div>
      </section>

      <section id="featured-vehicles" className="mx-auto w-full max-w-[1440px] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0B5D3B]">Featured vehicles</p><h2 className="mt-1.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">Popular Listings</h2></div>
          <Link href={marketplaceHref} className="mb-1 hidden items-center gap-1.5 text-sm font-semibold text-[#0B5D3B] hover:text-[#063F2C] sm:flex">View All Vehicles <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
          {loadingVehicles && Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[310px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
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
        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-slate-600">We are all about our client’s comfort and safety. That’s why we provide the best service you can imagine.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, description, icon: Icon, tone }) => <article key={title} className="flex min-h-[150px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}><Icon size={20} strokeWidth={1.8} /></span><h3 className="mt-auto pt-7 text-base font-semibold leading-5 text-slate-900">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-500">{description}</p></article>)}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-slate-950">
        <Image src="/images/pexels-cripsdog-24018795.jpg" alt="Open road ready for your next drive" fill sizes="100vw" className="-z-20 object-cover object-center" />
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

function SearchSelect({ label, icon, value, onChange, options }: { label: string; icon: ReactNode; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="flex min-h-14 min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-slate-50 sm:gap-3 sm:px-3 lg:px-2.5 xl:px-3"><span className="shrink-0 text-slate-700">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-medium text-slate-400">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 block w-full min-w-0 appearance-none truncate bg-transparent text-sm font-semibold text-slate-700 outline-none"><option value={label === "Location" ? "All Locations" : label === "Make" ? "Any Make" : "Any Model"}>{label === "Location" ? "Any Location" : label === "Make" ? "Any Make" : "Any Model"}</option>{options.filter((option) => option !== "All Locations" && option !== "Any Make" && option !== "Any Model").map((option) => <option key={option}>{option}</option>)}</select></span><ChevronDown size={15} className="shrink-0 text-slate-400" /></label>;
}

function TrustItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 px-3 py-3 first:pl-0 last:pr-0 sm:px-5 lg:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0B5D3B]">{icon}</span><span><span className="block text-xs font-bold text-slate-900 sm:text-sm">{title}</span><span className="mt-0.5 hidden text-xs text-slate-500 sm:block">{text}</span></span></div>;
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.coverImage || vehicle.images?.[0] || "/images/easy-ride-hero.svg";
  return <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
    <div className="relative h-[155px] overflow-hidden bg-slate-100"><Link href={`/vehicle/${vehicle.id}`} aria-label={`View ${vehicle.make} ${vehicle.model}`}><Image src={image} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" /></Link><span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white ${vehicle.listingType === "rent" ? "bg-[#0B5D3B]" : "bg-emerald-600"}`}>For {vehicle.listingType === "rent" ? "Rent" : "Sale"}</span><span className="absolute right-3 top-3"><FavoriteButton listingId={vehicle.id} compact /></span></div>
    <div className="p-3.5"><Link href={`/vehicle/${vehicle.id}`} className="font-semibold text-slate-900 hover:text-[#0B5D3B]">{vehicle.make} {vehicle.model} <span className="font-normal text-slate-500">{vehicle.year}</span></Link><p className="mt-1 text-lg font-bold text-slate-900">{vehicle.currency === "USD" ? "$" : `${vehicle.currency} `}{vehicle.price.toLocaleString()}{vehicle.listingType === "rent" && <span className="text-xs font-medium text-slate-500"> / {vehicle.priceLabel || "day"}</span>}</p><p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{vehicle.location?.city || "Zimbabwe"}, {vehicle.location?.country || "Zimbabwe"}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><Gauge size={13} />{vehicle.transmission}</span><span className="flex items-center gap-1"><Fuel size={13} />{vehicle.fuelType}</span><span className="flex items-center gap-1"><CarFront size={14} />{vehicle.bodyType || "Vehicle"}</span></div><Link href={`/vehicle/${vehicle.id}`} className="mt-3 block rounded-lg border border-[#0B5D3B] py-2 text-center text-xs font-bold text-[#0B5D3B] transition hover:bg-[#0B5D3B] hover:text-white">View Details</Link></div>
  </article>;
}
