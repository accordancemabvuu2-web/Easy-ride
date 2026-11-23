import { Inter } from "next/font/google";

/**
 * Inter is scoped to the administration shell so the public marketplace keeps
 * its existing typography while the admin console gets tabular numerals.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
