"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  useEffect(() => {
    const isRegistered = searchParams.get("registered") === "true";
    const emailParam = searchParams.get("email");
    if (isRegistered) {
      setRegisteredSuccess(true);
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const getNextPath = () => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(trimmedEmail, password, needs2FA ? twoFactorCode.trim() : undefined);

      toast.success("Welcome back.");
      router.replace(getNextPath());
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "2FA_REQUIRED") {
          setNeeds2FA(true);
          toast("Please enter your two-factor authentication code.", { icon: "🔐" });
        } else if (err.statusCode === 401 || err.code === "UNAUTHENTICATED" || err.code === "INVALID_CREDENTIALS") {
          setErrorMessage("Incorrect email address or password. Please try again.");
        } else if (err.code === "ACCOUNT_SUSPENDED") {
          setErrorMessage("This account has been suspended. Please contact customer support.");
        } else if (err.code === "CONFIGURATION_ERROR") {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(err.message || "Failed to sign in. Please verify your credentials.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-10 text-[#202124]">
      <section className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B] hover:underline"
        >
          <ArrowLeft size={18} />
          Return home
        </Link>

        <div className="mt-6 rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B5D3B] text-white">
            <LockKeyhole />
          </div>

          <h1 className="mt-6 text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-gray-500">
            Log in to manage vehicles and your marketplace activity.
          </p>

          {registeredSuccess && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              <CheckCircle2 size={20} className="shrink-0 text-[#0B5D3B]" />
              <div>
                <p className="font-bold">Account created successfully!</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Please sign in with your email and password to continue to your dashboard.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E7EB] py-3.5 pl-11 pr-4 text-base outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                Password
              </label>
              <div className="relative">
                <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E7EB] py-3.5 pl-11 pr-12 text-base outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {needs2FA && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Two-Factor Authentication Code
                </label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-center text-lg font-mono tracking-widest outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  placeholder="000000"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[#0B5D3B] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white transition hover:bg-[#094c30] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={19} /> Signing in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            New to Easy Ride?{" "}
            <Link
              href={`/register?next=${encodeURIComponent(getNextPath())}`}
              className="font-bold text-[#0B5D3B] hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
