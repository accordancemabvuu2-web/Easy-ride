"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Car,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "buyer" as "buyer" | "seller",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (form.password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await register(form);
      toast.success("Your Easy Ride account has been created.");
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Welcome to Easy Ride.");
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google registration failed."
      );
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(11,93,59,0.08),_transparent_45%),linear-gradient(180deg,#f8f9fa_0%,#eef2f7_100%)] px-4 py-6 text-[#202124] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B] transition hover:text-[#084b30]"
        >
          <ArrowLeft size={18} />
          Return home
        </Link>

        <section className="mt-6 overflow-hidden rounded-[36px] border border-white/60 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
          <div className="grid min-h-[820px] lg:grid-cols-[0.92fr_1.08fr]">
            <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b5d3b] via-[#0a6a44] to-[#063821] px-8 py-10 text-white sm:px-10 lg:px-12">
              <div className="absolute inset-0">
                <Image
                  src="https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b5d3b]/95 via-[#0b5d3b]/80 to-[#031b11]/92" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <Car className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/65">
                      Easy Ride
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white/80">
                      Drive with confidence
                    </p>
                  </div>
                </div>

                <div className="mt-16 max-w-md">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#C9A227]">
                    Start here
                  </p>
                  <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                    Welcome to Easy Ride
                  </h1>
                  <p className="mt-5 max-w-sm text-base leading-8 text-white/80 sm:text-lg">
                    Create your account to browse vehicles, save favorites and
                    post listings that reach real buyers.
                  </p>
                </div>

                <div className="mt-12 space-y-4">
                  {[
                    {
                      icon: Sparkles,
                      title: "Explore thousands of vehicles",
                      description: "Search cars for sale, rent or sell.",
                    },
                    {
                      icon: CheckCircle2,
                      title: "List your vehicle with confidence",
                      description: "Add details, photos and contact info.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Safe, trusted community",
                      description: "Built for verified buyers and sellers.",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
                      >
                        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-white/70">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative z-10 mt-12 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Your information is secure</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      We only use your details to create your Easy Ride account.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
              <div className="w-full max-w-2xl">
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0B5D3B]">
                    Create your account
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-[#1f2937] sm:text-4xl">
                    Browse vehicles or create listings as a seller.
                  </h2>
                </div>

                <form onSubmit={submit} className="mt-10 space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-600">
                        Full name
                      </span>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          value={form.name}
                          onChange={(event) => update("name", event.target.value)}
                          className="input pr-12"
                          placeholder="Your full name"
                        />
                      </div>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-600">
                        Email address
                      </span>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(event) => update("email", event.target.value)}
                          className="input pr-12"
                          placeholder="name@example.com"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-600">
                        Phone or WhatsApp number
                      </span>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          value={form.phone}
                          onChange={(event) => update("phone", event.target.value)}
                          className="input pr-12"
                          placeholder="+263 77 123 4567"
                        />
                      </div>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-600">
                        Password
                      </span>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="password"
                          value={form.password}
                          onChange={(event) => update("password", event.target.value)}
                          className="input pr-12"
                          placeholder="Create a password"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-600">
                      I am a...
                    </span>
                    <div className="relative">
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <select
                        value={form.role}
                        onChange={(event) => update("role", event.target.value)}
                        className="input pr-12"
                      >
                        <option value="buyer">Buyer or renter</option>
                        <option value="seller">Private seller</option>
                      </select>
                    </div>
                  </label>

                  <button
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 text-lg font-bold text-white shadow-[0_18px_40px_rgba(11,93,59,0.22)] transition hover:bg-[#084b30] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="animate-spin" size={19} />}
                    Create Account
                  </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm text-gray-500">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={googleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-6 py-4 font-semibold text-[#1f2937] shadow-sm transition hover:border-[#0B5D3B]/30 hover:bg-[#F8F9FA]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-bold text-[#4285F4]">
                    G
                  </span>
                  Continue with Google
                </button>

                <p className="mt-8 text-center text-sm text-gray-500">
                  Already registered?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#0B5D3B] underline-offset-4 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
