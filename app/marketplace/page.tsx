import Navbar from "@/Components/Navbar";
import HomeMarketplace from "@/Components/HomeMarketplace";
import Footer from "@/Components/Footer";
import { Suspense } from "react";

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
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
      <Footer />
    </main>
  );
}
