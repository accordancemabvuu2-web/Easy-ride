"use client";

import { useAuth } from "@/contexts/AuthContext";
import { startConversation } from "@/services/messageService";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

interface MessageSellerModalProps {
  vehicle: Vehicle;
}

export default function MessageSellerModal({ vehicle }: MessageSellerModalProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    `Hello, I am interested in your ${vehicle.make} ${vehicle.model} ${vehicle.year}. Is it still available?`,
  );
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    if (!profile) {
      toast.error("Log in to message the seller.");
      router.push("/login");
      return;
    }

    if (profile.id === vehicle.ownerId) {
      toast.error("This is your own listing.");
      return;
    }

    if (!message.trim()) {
      toast.error("Enter a message.");
      return;
    }

    try {
      setSubmitting(true);
      const id = await startConversation(
        vehicle,
        {
          id: profile.id,
          name: profile.name,
        },
        message.trim(),
      );

      toast.success("Message sent.");
      setOpen(false);
      router.push(`/messages?conversation=${id}`);
    } catch {
      toast.error("The message could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-4 font-bold text-[#0B5D3B]"
      >
        <MessageCircle size={20} />
        Message Seller
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Message seller</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="input mt-6 resize-none"
            />

            <button
              type="button"
              onClick={send}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={19} />}
              Send Message
            </button>
          </div>
        </div>
      )}
    </>
  );
}
