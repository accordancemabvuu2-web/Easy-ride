"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email") || undefined;
  const { verifyEmail, resendVerification } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No verification token provided."
  );
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    void verifyEmail(token, email)
      .then(() => {
        if (isMounted) setStatus("success");
      })
      .catch((err: any) => {
        if (isMounted) {
          setStatus("error");
          setErrorMessage(err.message || "This verification link is invalid or has expired.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, email, verifyEmail]);

  const handleResend = async () => {
    if (!email) return;
    try {
      setResending(true);
      await resendVerification(email);
      setResendSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-[32px] border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
      {status === "verifying" && (
        <div className="py-8">
          <Loader2 className="mx-auto animate-spin text-[#0B5D3B]" size={48} />
          <h1 className="mt-6 text-2xl font-bold">Verifying your email</h1>
          <p className="mt-2 text-gray-500">Please wait while we confirm your account...</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-6">
          <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
          <h1 className="mt-5 text-3xl font-bold">Email verified!</h1>
          <p className="mt-2 text-gray-600">
            Your Easy Ride account has been successfully verified. You now have full access to browse, sell, and manage vehicles.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3.5 font-bold text-white transition hover:bg-[#094c30]"
            >
              Continue to Dashboard
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="py-6">
          <XCircle className="mx-auto text-red-500" size={56} />
          <h1 className="mt-5 text-2xl font-bold">Verification failed</h1>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

          {email && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              {resendSuccess ? (
                <p className="text-sm font-semibold text-emerald-600">
                  A fresh verification link has been sent to {email}.
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {resending && <Loader2 className="animate-spin" size={16} />}
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-gray-100 px-6 py-3.5 font-bold text-gray-700 transition hover:bg-gray-200"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-16 text-[#202124]">
      <div className="mx-auto max-w-lg mb-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B]">
          <ArrowLeft size={18} /> Return home
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg rounded-[32px] border border-[#E5E7EB] bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto animate-spin text-[#0B5D3B]" size={36} />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}

