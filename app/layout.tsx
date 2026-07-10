import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import Providers from "@/Components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Easy Ride | Buy, Rent and Sell Vehicles",
  description:
    "Discover vehicles for sale and rent, showcase your car and connect with trusted sellers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} min-h-screen bg-[#F8F9FA] text-[#202124] antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
