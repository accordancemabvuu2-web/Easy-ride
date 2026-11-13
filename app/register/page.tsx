"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
        </main>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 10) {
      setError("Your password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password confirmation.");
      return;
    }

    try {
      setLoading(true);
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        phone: trimmedPhone || undefined,
        role: "buyer",
      });

      toast.success("Account created successfully! Please sign in.", { duration: 5000 });
      router.push(`/login?registered=true&email=${encodeURIComponent(trimmedEmail)}&next=${encodeURIComponent(nextTarget)}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_IN_USE") {
          setError("An account with this email address already exists. Please sign in instead.");
        } else if (err.code === "VALIDATION_ERROR" && err.details && typeof err.details === "object") {
          const details = err.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
          if (details.fieldErrors && Object.keys(details.fieldErrors).length > 0) {
            setFieldErrors(details.fieldErrors);
            const firstKey = Object.keys(details.fieldErrors)[0];
            const firstMsg = details.fieldErrors[firstKey]?.[0];
            setError(firstMsg || err.message);
          } else {
            setError(err.message);
          }
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B] hover:underline"
        >
          <ArrowLeft size={18} /> Return home
        </Link>

        <section className="mt-6 grid overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.8fr_1.2fr]">
          {/* Brand showcase sidebar */}
          <aside className="hidden bg-[#063F2C] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5">
                <CarFront className="text-[#E7B319]" size={22} />
                <span className="font-extrabold tracking-tight">EASY<span className="text-[#E7B319]">RIDE</span></span>
              </div>

              <h1 className="mt-12 text-4xl font-extrabold leading-tight">
                Your journey starts with a trusted account.
              </h1>
              <p className="mt-5 text-sm leading-6 text-emerald-100/80">
                Join thousands of verified vehicle buyers and sellers across the marketplace.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-emerald-100/90">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <ShieldCheck className="text-[#E7B319]" size={20} />
                <span>Verified profiles and secure direct enquiries</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <Check className="text-[#E7B319]" size={20} />
                <span>Default buyer privileges with one-click seller upgrade</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <ArrowRight className="text-[#E7B319]" size={20} />
                <span>Full access to listings, saved cars, and bookings</span>
              </div>
            </div>
          </aside>

          {/* Form container */}
          <div className="p-6 sm:p-10">
            <div>
              <div className="inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5D3B]">
                New Account
              </div>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                Create your Easy Ride account
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Register as a vehicle customer. You can activate seller privileges anytime from your dashboard.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Full name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tendai Moyo"
                    className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName[0]}</p>
                )}
              </div>

              {/* Email */}
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Phone or WhatsApp <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+263 77 123 4567"
                    className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  />
                </div>
                {fieldErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber[0]}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Password <span className="text-[11px] font-normal text-gray-500">(minimum 10 characters)</span>
                </label>
                <div className="relative">
                  <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    minLength={10}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
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
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Confirm password
                </label>
                <div className="relative">
                  <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    minLength={10}
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5D3B] px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#084B30] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              Already have an Easy Ride account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(nextTarget)}`}
                className="font-bold text-[#0B5D3B] hover:underline"
              >
                Log in here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
