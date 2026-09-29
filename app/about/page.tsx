import Footer from "@/Components/Footer";
import LandingNavbar from "@/Components/LandingNavbar";
import { ArrowDown, ArrowRight, CalendarDays, CarFront, Search, Store, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const experiences = [
  {
    title: "Buy",
    description: "Discover vehicles, compare details, save favorites, contact sellers and make offers.",
    icon: Search,
    href: "/marketplace?type=buy",
    action: "Explore vehicles",
  },
  {
    title: "Rent",
    description: "Find a vehicle for your trip, check availability and request the dates you need.",
    icon: CalendarDays,
    href: "/marketplace?type=rent",
    action: "Find a rental",
  },
  {
    title: "Sell",
    description: "Create a listing, add photos and pricing, then manage enquiries in one place.",
    icon: CarFront,
    href: "/create-listing",
    action: "List a vehicle",
  },
];

const steps = [
  ["01", "Discover", "Browse vehicles and compare the details that matter."],
  ["02", "Connect", "Contact the seller or dealer directly through the listing."],
  ["03", "Deal or book", "Make an offer or request a rental booking."],
  ["04", "Drive", "Agree the next steps and get on the road."],
];

const audiences = [
  { title: "Buyers & renters", description: "Find vehicles and compare your options in one place.", icon: Search },
  { title: "Individual sellers", description: "Publish and manage your own vehicle listings.", icon: Users },
  { title: "Dealers", description: "Manage your inventory and reach people looking for vehicles.", icon: Store },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <LandingNavbar />

      <section className="relative isolate min-h-[480px] overflow-hidden bg-[#062D20] text-white sm:min-h-[540px]">
        <Image
          src="/pexels-shkrabaanthony-7144213.jpg"
          alt="A car ready for the open road"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#031D15]/95 via-[#063D2A]/80 to-[#063D2A]/20" />
        <div className="mx-auto flex min-h-[480px] max-w-7xl items-center px-4 pb-16 pt-24 sm:min-h-[540px] sm:py-20 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#E7B319]">About Easy Ride</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">A simpler way to buy, sell and rent vehicles.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Easy Ride brings vehicle discovery, sellers, dealers and renters together in one easy-to-use marketplace.
            </p>
            <Link href="/marketplace" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-[#063F2C] transition hover:bg-emerald-50">
              Browse vehicles <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.17em] text-[#08784D]">What is Easy Ride?</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One place to make your next move.</h2>
        </div>
        <div className="space-y-4 text-base leading-8 text-gray-600 sm:text-lg">
          <p className="font-semibold text-gray-900">Easy Ride is a digital vehicle marketplace built to make buying, selling and renting vehicles simpler.</p>
          <p>Buyers and renters can discover vehicles, compare listings, view locations, communicate with sellers and dealers, make offers and manage bookings from one platform. Sellers and dealers can publish and manage inventory, respond to enquiries and reach people searching for vehicles.</p>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.17em] text-[#08784D]">What you can do</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Three ways to get moving.</h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {experiences.map(({ title, description, icon: Icon, href, action }) => (
              <article key={title} className="flex min-h-64 flex-col rounded-3xl border border-[#DCE5DF] bg-[#F8FAF9] p-6 sm:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F2EC] text-[#08784D]"><Icon size={23} /></div>
                <h3 className="mt-5 text-2xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-gray-600">{description}</p>
                <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-[#08784D] hover:underline">{action} <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.17em] text-[#08784D]">How it works</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From search to the open road.</h2>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, description], index) => (
            <div key={number} className="relative rounded-3xl border border-[#DCE5DF] bg-white p-6">
              <span className="text-sm font-black tracking-widest text-[#C9A227]">{number}</span>
              <h3 className="mt-4 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
              {index < steps.length - 1 && <ArrowDown aria-hidden="true" className="absolute -bottom-4 right-5 z-10 rotate-[-90deg] text-[#08784D] lg:hidden" size={18} />}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#EDF4F0] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.17em] text-[#08784D]">Built for real people</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A marketplace for every side of the journey.</h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {audiences.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-3xl bg-white p-6 sm:p-7">
                <Icon className="text-[#08784D]" size={25} />
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-gray-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.17em] text-[#08784D]">Why we built Easy Ride</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Finding a vehicle shouldn’t feel complicated.</h2>
        </div>
        <p className="text-base leading-8 text-gray-600 sm:text-lg">Easy Ride brings vehicle discovery, communication and transactions into one place, giving buyers, renters, sellers and dealers a simpler way to connect.</p>
      </section>

      <section className="bg-[#063F2C] px-4 py-14 text-white sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center lg:px-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ready to find your next ride?</h2>
            <p className="mt-2 text-white/75">Explore vehicles or bring yours to the marketplace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-[#063F2C] hover:bg-emerald-50">Browse vehicles <ArrowRight size={17} /></Link>
            <Link href="/create-listing" className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-3 font-bold text-white hover:bg-white/10">Sell your vehicle</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
