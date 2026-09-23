"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login, loginWithGoogle, firebaseEnabled } = useAuth();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      await login(email, password);

      toast.success("Welcome back.");
      router.replace(getNextPath());
    } catch {
      toast.error("Incorrect email address or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Welcome back.");
      router.replace(getNextPath());
    } catch {
      toast.error("Google login failed.");
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
            Log in to manage vehicles and saved listings.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              placeholder="Email address"
            />

            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              placeholder="Password"
            />

            <button
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={19} />}
              Log In
            </button>
          </form>

          <button
            type="button"
            onClick={googleLogin}
            className="mt-3 w-full rounded-full border border-[#E5E7EB] px-6 py-4 font-semibold"
          >
            Continue with Google
          </button>

          {!firebaseEnabled && (
            <div className="mt-5 rounded-2xl border border-[#C9A227]/30 bg-[#FFF9E8] p-4 text-sm text-[#5B4700]">
              <p className="font-semibold">Local admin test account</p>
              <p className="mt-1">
                Email: <span className="font-bold">admin@easyride.local</span>
              </p>
              <p>
                Password: <span className="font-bold">admin123</span>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            New to Easy Ride?{" "}
            <Link href="/register" onClick={(event) => { const next = new URLSearchParams(window.location.search).get("next"); if (next) { event.preventDefault(); router.push(`/register?next=${encodeURIComponent(next)}`); } }} className="font-bold text-[#0B5D3B]">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
