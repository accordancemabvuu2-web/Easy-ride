import { Suspense } from "react";
import BookingContent from "./BookingContent";

function BookingLoading() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-5 lg:px-8">
          <span className="h-5 w-20 animate-pulse rounded bg-[#E5E7EB]" />
          <span className="mx-auto h-5 w-40 animate-pulse rounded bg-[#E5E7EB]" />
          <span className="w-12" />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8" aria-label="Loading booking">
        <span className="block h-4 w-24 animate-pulse rounded bg-[#E5E7EB]" />
        <span className="mt-3 block h-10 w-72 max-w-full animate-pulse rounded bg-[#E5E7EB]" />
        <span className="mt-3 block h-5 w-full max-w-xl animate-pulse rounded bg-[#E5E7EB]" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white">
              <div className="aspect-[16/8] animate-pulse bg-[#E5E7EB]" />
              <div className="space-y-3 p-6">
                <span className="block h-4 w-16 animate-pulse rounded bg-[#E5E7EB]" />
                <span className="block h-7 w-48 animate-pulse rounded bg-[#E5E7EB]" />
                <span className="block h-4 w-36 animate-pulse rounded bg-[#E5E7EB]" />
              </div>
            </div>
            <div className="h-48 animate-pulse rounded-3xl border border-[#E5E7EB] bg-white" />
            <div className="h-40 animate-pulse rounded-3xl border border-[#E5E7EB] bg-white" />
          </div>
          <div className="h-72 animate-pulse rounded-3xl border border-[#E5E7EB] bg-white" />
        </div>
      </div>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingContent />
    </Suspense>
  );
}
