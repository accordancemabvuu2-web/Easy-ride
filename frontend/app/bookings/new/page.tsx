import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookingContent from "./BookingContent";

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </main>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
