"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createSupportTicket } from "@/services/supportService";
import { SupportCategory } from "@/Types/support";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SupportTicketForm() {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("other");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!profile) {
      toast.error("Log in to submit a support ticket.");
      return;
    }

    if (!subject.trim() || !description.trim()) {
      toast.error("Please complete the form.");
      return;
    }

    try {
      setSubmitting(true);
      await createSupportTicket({
        userId: profile.id,
        userName: profile.name,
        userEmail: profile.email,
        subject: subject.trim(),
        category,
        description: description.trim(),
      });
      toast.success("Support ticket submitted.");
      setSubject("");
      setDescription("");
      setCategory("other");
    } catch {
      toast.error("Support ticket could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <input
          className="input"
          placeholder="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <select
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value as SupportCategory)}
        >
          <option value="account">Account</option>
          <option value="listing">Listing</option>
          <option value="verification">Verification</option>
          <option value="fraud">Fraud</option>
          <option value="technical">Technical</option>
          <option value="payment">Payment</option>
          <option value="other">Other</option>
        </select>
        <textarea
          className="input min-h-[140px]"
          placeholder="Describe the issue"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
        >
          {submitting && <Loader2 className="animate-spin" size={18} />}
          Submit ticket
        </button>
      </div>
    </div>
  );
}
