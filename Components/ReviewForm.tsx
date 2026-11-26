"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createReview } from "@/lib/clientFirebaseServices";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ReviewForm({ bookingId }: { bookingId?: string }) {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!profile) {
      toast.error("Log in to leave a review.");
      return;
    }
    if (!bookingId) {
      toast.error("A completed booking is required to submit a review.");
      return;
    }

    try {
      setSubmitting(true);
      await createReview({ bookingId, rating, comment });
      toast.success("Review submitted for moderation.");
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
        Only a completed booking involving your account can be reviewed. Reviews are checked before appearing publicly.
      </p>
      {!bookingId ? (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Select this form from a completed booking to submit a review.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Review rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rating === value}
            aria-label={value + " out of 5 stars"}
            onClick={() => setRating(value)}
            className={"inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold " + (
              rating >= value ? "bg-[#0B5D3B] text-white" : "border border-[#E5E7EB] text-gray-700"
            )}
          >
            <Star size={16} aria-hidden="true" />
            {value}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="review-comment">Review comment</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={4000}
        className="input mt-4 min-h-28 resize-y"
        placeholder="Tell others about the experience"
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || !bookingId}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
        Submit Review
      </button>
    </section>
  );
}

