import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 bg-[#0B5D3B] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <p className="text-2xl font-bold">Easy Ride</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
            A trusted marketplace for buying, renting and showcasing vehicles.
          </p>
        </div>

        <div>
          <p className="font-bold">Marketplace</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
            <Link href="/?type=buy">Cars for sale</Link>
            <Link href="/?type=rent">Cars for rent</Link>
            <Link href="/map">Map search</Link>
          </div>
        </div>

        <div>
          <p className="font-bold">For Sellers</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
            <Link href="/create-listing">Post a vehicle</Link>
            <Link href="/dashboard">Seller dashboard</Link>
            <span>Dealer services</span>
          </div>
        </div>

        <div>
          <p className="font-bold">Support</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
            <Link href="/about">About</Link>
            <span>Help centre</span>
            <span>Contact us</span>
            <span>Safety advice</span>
            <span>Terms and privacy</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-sm text-white/50 lg:px-6">
          © {new Date().getFullYear()} Easy Ride. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
