"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createReview } from "@/services/reviewService";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ReviewForm({
  listing,
  bookingId,
  reviewedUserId,
  transactionId,
}: {
  listing: Vehicle;
  bookingId?: string;
  reviewedUserId: string;
  transactionId?: string;
}) {
  const { firebaseUser, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!firebaseUser || !profile) {
      toast.error("Log in to leave a review.");
      return;
    }

    try {
      setSubmitting(true);
      await createReview({
        bookingId,
        transactionId,
        reviewerId: firebaseUser.uid,
        reviewerName: profile.name,
        reviewedUserId,
        listingId: listing.id,
        rating,
        title,
        comment,
      });
      toast.success("Review submitted.");
      setTitle("");
      setComment("");
      setRating(5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Leave a review</h2>
      <p className="mt-1 text-sm text-gray-500">
        Reviews are available after a completed booking or transaction.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold ${
              rating >= value ? "bg-[#0B5D3B] text-white" : "border border-[#E5E7EB] text-gray-700"
            }`}
          >
            <Star size={16} />
            {value}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="input mt-4"
        placeholder="Review title"
      />

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="input mt-4 min-h-28 resize-none"
        placeholder="Tell others about the experience"
      />

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
      >
        {submitting && <Loader2 className="animate-spin" size={18} />}
        Submit Review
      </button>
    </section>
  );
}
