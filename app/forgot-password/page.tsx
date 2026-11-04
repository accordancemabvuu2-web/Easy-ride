"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
      toast.success("Password reset email sent.");
    } catch (err: any) {
      toast.error(err.message || "Could not process request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-16 text-[#202124]">
      <div className="mx-auto max-w-lg mb-6">
        <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B]">
          <ArrowLeft size={18} /> Back to Sign In
        </Link>
      </div>

      <div className="mx-auto max-w-lg rounded-[32px] border border-[#E5E7EB] bg-white p-8 shadow-sm sm:p-10">
        {!submitted ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B5D3B] text-white">
              <KeyRound size={26} />
            </div>

            <h1 className="mt-6 text-3xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Enter the email address associated with your Easy Ride account. We will send you instructions to choose a new password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-base outline-none transition focus:border-[#0B5D3B]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white transition hover:bg-[#094c30] disabled:opacity-60"
              >
                {submitting && <Loader2 className="animate-spin" size={19} />}
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto text-emerald-600" size={54} />
            <h2 className="mt-4 text-2xl font-bold">Check your inbox</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              If an active account exists for <strong>{email}</strong>, we have dispatched a password reset link. Please check your inbox and spam folder.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3.5 font-bold text-white transition hover:bg-[#094c30]"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

