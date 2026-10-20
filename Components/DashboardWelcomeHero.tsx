import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardWelcomeHero({
  name,
}: {
  name: string;
}) {
  return (
    <section className="relative isolate flex min-h-[280px] overflow-hidden rounded-xl border border-[#244238] bg-[#101915] sm:min-h-[320px]">
      <Image
        src="/images/pexels-dilrubasaricimen-7534335.jpg"
        alt="A vehicle ready for the open road"
        fill
        sizes="(max-width: 768px) 100vw, 1600px"
        className="-z-20 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08130f]/95 via-[#0b1813]/80 to-[#102a21]/25" />
      <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8fe0b5]">Drive a brighter tomorrow</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">Find your next ride, {name}.</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#e0e9e4] sm:text-base">Explore vehicles for sale or rent, save your favourites and connect with trusted sellers.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/marketplace" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#07543d] px-6 text-sm font-bold text-white transition hover:bg-[#064632]">Browse vehicles <ArrowRight size={17} /></Link>
          <Link href="/create-listing" className="inline-flex min-h-12 items-center rounded-full border border-[#8fe0b5] bg-[#14251e]/90 px-6 text-sm font-bold text-white transition hover:bg-[#1b3429]">List a vehicle</Link>
        </div>
      </div>
    </section>
  );
}
