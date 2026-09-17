import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#021C17] text-white">
      <div className="grid gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-10 xl:px-14">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white">
              <Image
                src="/images/Easy_Ride_automotive_logo_design_202609071232.jpeg"
                alt="Easy Ride logo"
                fill
                className="object-contain p-0.5"
                sizes="40px"
              />
            </div>
            <span className="text-xl font-black tracking-tight">
              EASY<span className="text-[#E7B319]">RIDE</span>
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
            Your trusted marketplace to buy, sell and rent vehicles with confidence.
          </p>
        </div>

        <FooterColumn title="Marketplace">
          <Link href="/marketplace">Cars for sale</Link>
          <Link href="/marketplace?type=rent">Cars for rent</Link>
          <Link href="/map">Map search</Link>
        </FooterColumn>

        <FooterColumn title="For Sellers">
          <Link href="/create-listing">Post a vehicle</Link>
          <Link href="/dashboard">Seller dashboard</Link>
          <Link href="/support">Dealer services</Link>
        </FooterColumn>

        <FooterColumn title="Support">
          <Link href="/about">About</Link>
          <Link href="/support">Help centre</Link>
          <Link href="/support">Contact us</Link>
          <Link href="/support">Safety advice</Link>
        </FooterColumn>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-sm text-white/50 sm:px-8 lg:px-10 xl:px-14">
        Copyright {new Date().getFullYear()} Easy Ride. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <div className="mt-4 flex flex-col gap-3 text-sm text-white/65 [&_a]:transition [&_a:hover]:text-[#E7B319]">
        {children}
      </div>
    </div>
  );
}
