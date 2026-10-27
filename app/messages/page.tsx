import { Suspense } from "react";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status">
          Loading messages...
        </main>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
