"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createListingReport } from "@/services/reportService";
import type { ReportReason } from "@/Types/report";
import type { Vehicle } from "@/Types/vehicle";
import { Flag, Loader2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ReportListingModal({
  vehicle,
}: {
  vehicle: Vehicle;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("suspected_scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!profile) {
      toast.error("Log in to report a listing.");
      router.push("/login");
      return;
    }

    try {
      setSubmitting(true);

      await createListingReport({
        listingId: vehicle.id,
        listingTitle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        reportedBy: profile.id,
        reason,
        details: details.trim(),
      });

      toast.success("Report submitted for review.");
      setOpen(false);
    } catch {
      toast.error("The report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold text-red-600"
      >
        <Flag size={17} />
        Report listing
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Report listing</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="input mt-6"
            >
              <option value="suspected_scam">Suspected scam</option>
              <option value="incorrect_information">Incorrect information</option>
              <option value="duplicate_listing">Duplicate listing</option>
              <option value="vehicle_unavailable">Vehicle unavailable</option>
              <option value="offensive_content">Offensive content</option>
              <option value="other">Other</option>
            </select>

            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              className="input mt-4 resize-none"
              placeholder="Provide additional details"
            />

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-4 font-bold text-white"
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              Submit Report
            </button>
          </div>
        </div>
      )}
    </>
  );
}
