"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      await login(email, password, needs2FA ? twoFactorCode : undefined);

      toast.success("Welcome back.");
      router.replace(getNextPath());
    } catch (err: any) {
      if (err.code === "2FA_REQUIRED") {
        setNeeds2FA(true);
        toast("Please enter your two-factor authentication code.", { icon: "🔐" });
      } else {
        toast.error(err.message || "Incorrect email address or password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Welcome back.");
      router.replace(getNextPath());
    } catch (err: any) {
      toast.error(err.message || "Google login failed.");
    }
  };

  const getNextPath = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-10 text-[#202124]">
      <section className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B]"
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

          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-base outline-none transition focus:border-[#0B5D3B]"
              placeholder="Email address"
            />

            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-base outline-none transition focus:border-[#0B5D3B]"
              placeholder="Password"
            />

            {needs2FA && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Two-Factor Authentication Code
                </label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E7EB] px-5 py-3.5 text-center text-lg font-mono tracking-widest outline-none transition focus:border-[#0B5D3B]"
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
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white transition hover:bg-[#094c30] disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={19} />}
              Log In
            </button>
          </form>

          <button
            type="button"
            onClick={googleLogin}
            className="mt-3 w-full rounded-full border border-[#E5E7EB] px-6 py-4 font-semibold transition hover:bg-gray-50"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            New to Easy Ride?{" "}
            <Link
              href="/register"
              onClick={(event) => {
                const next = new URLSearchParams(window.location.search).get("next");
                if (next) {
                  event.preventDefault();
                  router.push(`/register?next=${encodeURIComponent(next)}`);
                }
              }}
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
