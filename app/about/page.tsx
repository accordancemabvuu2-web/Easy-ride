import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
          About Easy Ride
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Built for a cleaner vehicle marketplace
        </h1>
        <p className="mt-6 max-w-3xl leading-8 text-gray-600">
          Easy Ride helps buyers, renters, sellers and dealers discover vehicles
          with less noise and more trust. Sprint 2 wires auth, listing approval,
          and protected dashboards so the public marketplace stays active-only.
        </p>
      </section>
      <Footer />
    </main>
  );
}
