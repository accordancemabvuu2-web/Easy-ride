import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ViewTransition } from "react";
import Providers from "@/Components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        className={`${inter.variable} min-h-screen bg-[#F8F9FA] text-[#202124] antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ViewTransition
          enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
          exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
            default="none"
          >
            {children}
          </ViewTransition>
        </Providers>
      </body>
    </html>
  );
}
