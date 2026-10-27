import { Suspense } from "react";
import OffersClient from "./OffersClient";

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status">
          Loading offers...
        </main>
      }
    >
      <OffersClient />
    </Suspense>
  );
}
