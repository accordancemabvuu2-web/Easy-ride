"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import toast from "react-hot-toast";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? "" : "Invalid or missing password reset token.");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("No reset token found in the URL.");
      return;
    }

    if (password.length < 10) {
      setError("Password must contain at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword(token, password);
      setSuccess(true);
      toast.success("Password updated successfully.");
    } catch (err: any) {
      setError(err.message || "Could not reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-6">
        <XCircle className="mx-auto text-red-500" size={54} />
        <h1 className="mt-4 text-2xl font-bold">Invalid Reset Link</h1>
        <p className="mt-2 text-sm text-gray-500">
          This password reset link is invalid or incomplete.
        </p>
        <div className="mt-8">
          <Link
            href="/forgot-password"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3.5 font-bold text-white"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="mx-auto text-emerald-600" size={54} />
        <h1 className="mt-4 text-2xl font-bold">Password Reset Complete</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your password has been securely updated. You can now log in with your new credentials.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3.5 font-bold text-white transition hover:bg-[#094c30]"
          >
            Sign In with New Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B5D3B] text-white">
        <KeyRound size={26} />
      </div>

      <h1 className="mt-6 text-3xl font-bold">Create new password</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">
        Choose a secure password of at least 10 characters for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">New Password</label>
          <input
            required
            type="password"
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters"
            className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-base outline-none transition focus:border-[#0B5D3B]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Confirm Password</label>
          <input
            required
            type="password"
            minLength={10}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-base outline-none transition focus:border-[#0B5D3B]"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white transition hover:bg-[#094c30] disabled:opacity-60"
        >
          {submitting && <Loader2 className="animate-spin" size={19} />}
          Update Password
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-16 text-[#202124]">
      <div className="mx-auto max-w-lg mb-6">
        <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B]">
          <ArrowLeft size={18} /> Back to Sign In
        </Link>
      </div>

      <div className="mx-auto max-w-lg rounded-[32px] border border-[#E5E7EB] bg-white p-8 shadow-sm sm:p-10">
        <Suspense
          fallback={
            <div className="text-center py-12">
              <Loader2 className="mx-auto animate-spin text-[#0B5D3B]" size={36} />
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}

