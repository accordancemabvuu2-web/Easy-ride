import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardWelcomeHero({
  name,
}: {
  name: string;
}) {
  return (
    <section className="relative isolate flex min-h-[280px] overflow-hidden rounded-xl border border-[#CEDBD0] bg-[#e8efeb] sm:min-h-[320px]">
      <Image
        src="/images/pexels-dilrubasaricimen-7534335.jpg"
        alt="A vehicle ready for the open road"
        fill
        sizes="(max-width: 768px) 100vw, 1600px"
        className="-z-20 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/75 to-[#102a21]/10" />
      <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#297359]">Drive a brighter tomorrow</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-[-0.045em] text-[#101915] sm:text-5xl">Find your next ride, {name}.</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#5c6962] sm:text-base">Explore vehicles for sale or rent, save your favourites and connect with trusted sellers.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/marketplace" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#07543d] px-6 text-sm font-bold text-white transition hover:bg-[#064632]">Browse vehicles <ArrowRight size={17} /></Link>
          <Link href="/create-listing" className="inline-flex min-h-12 items-center rounded-full border border-[#82a99a] bg-white/80 px-6 text-sm font-bold text-[#07543d] transition hover:bg-white">List a vehicle</Link>
        </div>
      </div>
    </section>
  );
}
