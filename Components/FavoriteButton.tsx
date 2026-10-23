"use client";

import { useAuth } from "@/contexts/AuthContext";
import { addFavorite, isFavorite, removeFavorite } from "@/services/favoriteService";
import { Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface FavoriteButtonProps {
  listingId: string;
  compact?: boolean;
}

export default function FavoriteButton({
  listingId,
  compact = false,
}: FavoriteButtonProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkFavorite() {
      if (!profile) {
        setChecking(false);
        return;
      }

      try {
        setFavorite(await isFavorite(profile.id, listingId));
      } finally {
        setChecking(false);
      }
    }

    void checkFavorite();
  }, [listingId, profile]);

  const toggleFavorite = async () => {
    if (!profile) {
      toast.error("Log in to save vehicles.");
      router.push("/login");
      return;
    }

    try {
      setLoading(true);

      if (favorite) {
        await removeFavorite(profile.id, listingId);
        setFavorite(false);
        toast.success("Removed from favorites.");
      } else {
        await addFavorite(profile.id, listingId);
        setFavorite(true);
        toast.success("Saved to favorites.");
      }
    } catch {
      toast.error("Favorite could not be updated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={favorite ? "Remove vehicle from favorites" : "Save vehicle to favorites"}
      onClick={toggleFavorite}
      disabled={loading || checking}
      className={`flex items-center justify-center gap-2 transition ${
        compact
          ? "h-10 w-10 rounded-full border border-white/20 bg-white/95 shadow"
          : "rounded-full border border-[#E5E7EB] px-5 py-3 font-semibold"
      }`}
    >
      {loading || checking ? (
        <Loader2 size={19} className="animate-spin" />
      ) : (
        <Heart size={19} className={favorite ? "fill-red-500 text-red-500" : "text-gray-600"} />
      )}

      {!compact && <span>{favorite ? "Saved" : "Save"}</span>}
    </button>
  );
}
