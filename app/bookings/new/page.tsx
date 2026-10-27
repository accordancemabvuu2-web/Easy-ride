import { Suspense } from "react";
import NewBookingClient from "./NewBookingClient";

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6" role="status">
          Loading booking details...
        </main>
      }
    >
      <NewBookingClient />
    </Suspense>
  );
}
