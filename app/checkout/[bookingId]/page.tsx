import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status">
          Loading checkout...
        </main>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
