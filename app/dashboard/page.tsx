import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status">
          Loading dashboard...
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
