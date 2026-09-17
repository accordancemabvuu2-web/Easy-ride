"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthProvider>
      {children}
      {mounted && (
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
          }}
        />
      )}
    </AuthProvider>
  );
}
