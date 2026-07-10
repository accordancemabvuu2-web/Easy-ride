import Footer from "@/Components/Footer";
import Hero from "@/Components/Hero";
import HomeMarketplace from "@/Components/HomeMarketplace";
import Navbar from "@/Components/Navbar";
import SectionTitle from "@/Components/SectionTitle";
import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Trusted listings",
    description:
      "Verified seller indicators and structured vehicle information improve buyer confidence.",
  },
  {
    icon: Search,
    title: "Simple discovery",
    description:
      "Search and filter vehicles by listing type, location, make, model and other useful details.",
  },
  {
    icon: MapPin,
    title: "Location focused",
    description:
      "Find nearby vehicles and eventually explore sellers, rentals and service providers on the map.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <Hero />
      <Suspense
        fallback={
          <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
              Loading marketplace...
            </div>
          </section>
        }
      >
        <HomeMarketplace />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <SectionTitle
          eyebrow="Why Easy Ride"
          title="A better vehicle marketplace experience"
          description="Easy Ride combines simple vehicle discovery, cleaner listings, direct seller contact and location-based services."
          align="center"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="rounded-3xl border border-[#E5E7EB] bg-white p-7 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B5D3B]/10 text-[#0B5D3B]">
                  <Icon />
                </div>

                <h3 className="mt-5 text-xl font-bold">{benefit.title}</h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {benefit.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[32px] bg-[#121212] px-7 py-12 text-white md:flex-row md:items-center md:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Ready to sell or rent?
            </p>

            <h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">
              Showcase your vehicle to interested buyers and renters.
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-white/60">
              Create a structured listing with vehicle details, photographs,
              contact information and location.
            </p>
          </div>

          <Link
            href="/create-listing"
            className="flex shrink-0 items-center gap-2 rounded-full bg-[#C9A227] px-7 py-4 font-bold text-[#121212] transition hover:bg-[#B58F1E]"
          >
            Post Your Car
            <ArrowRight size={19} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
