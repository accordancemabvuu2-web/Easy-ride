"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import toast from "react-hot-toast";

type AccountType = "buyer" | "seller" | "dealer";

function passwordScore(password: string): { label: string; tone: string } {
  if (password.length < 10) return { label: "Too short", tone: "bg-red-500" };
  const score = [/[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (score <= 2) return { label: "Could be stronger", tone: "bg-amber-500" };
  return { label: "Strong password", tone: "bg-emerald-600" };
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#0B5D3B]" size={36} /></main>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next")?.startsWith("/") && !searchParams.get("next")?.startsWith("//")
    ? searchParams.get("next")!
    : "/dashboard";
  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [address, setAddress] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const strength = useMemo(() => passwordScore(password), [password]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim()) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return setError("Please provide a valid email address.");
    if (password.length < 10) return setError("Your password must be at least 10 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (accountType === "dealer" && (!businessName.trim() || !registrationNumber.trim() || !businessEmail.trim() || !businessPhone.trim() || !address.trim())) {
      return setError("Please complete all dealership application fields.");
    }
    if (!termsAccepted) return setError("Please accept the Easy Ride terms to continue.");

    try {
      setLoading(true);
      const result = await register({
        name: name.trim(),
        email: trimmedEmail,
        password,
        phone: phone.trim() || undefined,
        accountType,
        businessName: accountType === "dealer" ? businessName.trim() : undefined,
        businessRegistrationNumber: accountType === "dealer" ? registrationNumber.trim() : undefined,
        dealerDescription: accountType === "dealer"
          ? `Contact: ${businessEmail.trim()} | ${businessPhone.trim()} | ${address.trim()}`
          : undefined,
      });

      if (result.accessToken || result.sessionCreated) {
        toast.success("Account created successfully.");
        router.replace(accountType === "dealer" ? "/dealer/profile" : nextTarget);
      } else {
        toast.success(accountType === "dealer"
          ? "Account created. Sign in to continue with your pending dealership application."
          : "Account created successfully. Please sign in.", { duration: 5000 });
        router.push(`/login?registered=true&email=${encodeURIComponent(trimmedEmail)}&next=${encodeURIComponent(nextTarget)}`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_IN_USE" || err.code === "DUPLICATE_EMAIL" || err.statusCode === 409) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (err.details && typeof err.details === "object") {
          const details = err.details as { fieldErrors?: Record<string, string[]> };
          setFieldErrors(details.fieldErrors || {});
          setError(Object.values(details.fieldErrors || {}).flat()[0] || err.message);
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B] hover:underline"><ArrowLeft size={18} /> Return home</Link>
        <section className="mt-6 grid overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="hidden bg-[#063F2C] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5"><Store className="text-[#E7B319]" size={22} /><span className="font-extrabold">EASY<span className="text-[#E7B319]">RIDE</span></span></div>
              <h1 className="mt-12 text-4xl font-extrabold leading-tight">Your journey starts with a trusted account.</h1>
              <p className="mt-5 text-sm leading-6 text-emerald-100/80">Buy, sell, or apply to operate a verified dealership on Easy Ride.</p>
            </div>
            <div className="space-y-3.5 text-xs text-emerald-100/90"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><ShieldCheck className="text-[#E7B319]" size={20} /> Secure account and verified profiles</div><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><Check className="text-[#E7B319]" size={20} /> Admin approval protects the marketplace</div></div>
          </aside>
          <div className="p-6 sm:p-10">
            <div className="inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5D3B]">New account</div>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Create your Easy Ride account</h2>
            <p className="mt-2 text-sm text-gray-500">Choose how you plan to use Easy Ride. Admin roles are never available through public registration.</p>
            {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-700">Account type</legend><div className="grid gap-2 sm:grid-cols-3">{(["buyer", "seller", "dealer"] as AccountType[]).map((type) => <label key={type} className={`cursor-pointer rounded-2xl border p-3 text-sm font-bold ${accountType === type ? "border-[#0B5D3B] bg-emerald-50 text-[#0B5D3B]" : "border-slate-200"}`}><input className="sr-only" type="radio" name="accountType" value={type} checked={accountType === type} onChange={() => setAccountType(type)} />{type === "buyer" ? "Buyer" : type === "seller" ? "Individual Seller" : "Dealer / Dealership"}<span className="mt-1 block text-[11px] font-normal text-gray-500">{type === "dealer" ? "Application requires approval" : type === "seller" ? "List your own vehicles" : "Browse and enquire"}</span></label>)}</div></fieldset>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">Full name</label><div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm" placeholder="e.g. Tendai Moyo" /></div>{fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName[0]}</p>}</div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">Email address</label><div className="relative"><Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm" placeholder="name@example.com" /></div></div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">Phone <span className="font-normal text-gray-400">(optional)</span></label><div className="relative"><Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm" placeholder="+263 77 123 4567" /></div></div>
              {accountType === "dealer" && <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2"><p className="text-xs text-blue-900 sm:col-span-2">Your dealership application is created with this registration and remains pending until backend verification. You will not receive dealer privileges automatically.</p><input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Business name" /><input required value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Registration number" /><input required type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Business email" /><input required value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Business phone" /><input required value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm sm:col-span-2" placeholder="Business address" /></div>}
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">Password</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required minLength={10} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-12 text-sm" placeholder="At least 10 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{password && <div className="mt-2"><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${strength.tone}`} style={{ width: `${Math.min(100, Math.max(20, password.length * 6))}%` }} /></div><p className="mt-1 text-xs text-gray-500">{strength.label}</p></div>}</div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">Confirm password</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input required minLength={10} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-12 text-sm" placeholder="Re-enter your password" /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              <label className="flex items-start gap-3 text-sm text-gray-600"><input required type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 accent-[#0B5D3B]" />I agree to the Easy Ride terms and privacy policy.</label>
              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5D3B] px-6 py-4 text-sm font-bold text-white disabled:opacity-60">{loading ? <><Loader2 className="animate-spin" size={18} /> Creating account...</> : <>Create account <ArrowRight size={18} /></>}</button>
            </form>
            <p className="mt-8 text-center text-sm text-gray-600">Already have an account? <Link href={`/login?next=${encodeURIComponent(nextTarget)}`} className="font-bold text-[#0B5D3B] hover:underline">Log in here</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
