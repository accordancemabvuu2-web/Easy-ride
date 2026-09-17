"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RequireAuth from "@/Components/RequireAuth";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardRouter />
    </RequireAuth>
  );
}

function DashboardRouter() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !profile) return;

    const redirects: Record<string, string> = {
      admin: "/admin",
      dealer: "/dealer/dashboard",
      seller: "/dashboard/seller",
      buyer: "/dashboard/buyer",
    };

    const redirectUrl = redirects[profile.role] || "/dashboard/buyer";
    router.replace(redirectUrl);
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
      </div>
    );
  }

  return null;
}

// Legacy code kept for reference - now uses role-based routing above
/*
function DashboardContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const loadListings = useCallback(async () => {
    if (!profile) return;
    try {
      setLoadingListings(true);
      setListings(await getMyListings(profile.id));
    } catch {
      toast.error("Your listings could not be loaded.");
    } finally {
      setLoadingListings(false);
    }
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadListings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadListings]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      active: listings.filter((listing) => listing.status === "active").length,
      pending: listings.filter((listing) => listing.status === "pending").length,
    }),
    [listings]
  );

  const removeListing = async (listing: Vehicle) => {
    if (!window.confirm("Delete this listing?")) {
      return;
    }

    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted.");
      await loadListings();
    } catch {
      toast.error("Listing could not be deleted.");
    }
  };

  const markSold = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, listing.listingType === "buy" ? "sold" : "rented");
      toast.success("Listing updated.");
      await loadListings();
    } catch {
      toast.error("Status could not be updated.");
    }
  };

*/
