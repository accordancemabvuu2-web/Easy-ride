"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";

type Intent = "buyer" | "seller";
type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const {
    register,
    loginWithGoogle,
    updateAccountRole,
    sendVerificationEmail,
    checkEmailVerification,
    firebaseEnabled,
  } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    intent: null as Intent | null,
  });

  const nextPath = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  };

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/create-listing")) {
      setForm((current) => ({ ...current, intent: "seller" }));
    }
  }, []);

  const update = (field: keyof typeof form, value: string | Intent | null) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      setStep(3);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Please enter your name and email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        role: "buyer",
      });
      setStep(firebaseEnabled ? 2 : 3);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const continueAfterVerification = async () => {
    try {
      setLoading(true);
      if (firebaseEnabled && !(await checkEmailVerification())) {
        setError("Please verify your email using the link we sent, then try again.");
        return;
      }
      setStep(3);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!form.intent) {
      setError("Choose whether you want to buy or rent, or sell a vehicle.");
      return;
    }
    if (form.intent === "seller" && !form.phone.trim()) {
      setError("Sellers need a phone or WhatsApp number so buyers can contact them.");
      return;
    }

    try {
      setLoading(true);
      await updateAccountRole(form.intent, form.phone.trim());
      toast.success("Your Easy Ride account is ready.");
      router.replace(form.intent === "seller" ? "/create-listing" : nextPath());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not finish setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f6] px-5 py-8 text-slate-900 sm:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-[#0B5D3B]">
          <ArrowLeft size={18} /> Home
        </Link>

        <section className="mt-6 grid overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="hidden bg-[#0B5D3B] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <CarFront size={20} /> <span className="font-semibold">Easy Ride</span>
              </div>
              <h1 className="mt-12 max-w-md text-5xl font-extrabold leading-tight">
                Your next journey starts here.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-emerald-50/80">
                One account for discovering vehicles, renting, buying and selling.
              </p>
            </div>
            <div className="space-y-3 text-sm text-emerald-50">
              <Benefit icon={<ShieldCheck size={18} />} text="One secure account for every journey" />
              <Benefit icon={<Check size={18} />} text="Choose your path when you are ready" />
              <Benefit icon={<ArrowRight size={18} />} text="Become a verified dealer later" />
            </div>
          </aside>

          <div className="px-5 py-8 sm:px-10 sm:py-12">
            <div className="mb-10">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                {["Account", "Verify", "Personalize"].map((label, index) => (
                  <span key={label} className={step > index ? "text-[#0B5D3B]" : ""}>{label}</span>
                ))}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0B5D3B] transition-all" style={{ width: `${step * 33.33}%` }} />
              </div>
            </div>

            {step === 1 && (
              <div className="mx-auto max-w-xl">
                <Header eyebrow="Create your account" title="Get started with Easy Ride." />
                <button type="button" onClick={handleGoogle} disabled={loading} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 px-4 py-3.5 font-semibold transition hover:bg-slate-50 disabled:opacity-60">
                  <span className="text-lg font-bold text-[#4285F4]">G</span>
                  {loading ? "Connecting..." : "Continue with Google"}
                </button>
                <div className="my-7 flex items-center gap-4 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" /> OR <div className="h-px flex-1 bg-slate-200" /></div>
                <form onSubmit={createAccount} className="space-y-5">
                  <Field label="Full name"><input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" className="input" /></Field>
                  <Field label="Email address"><input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@example.com" className="input" /></Field>
                  <Field label="Password"><input required minLength={8} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" className="input" /></Field>
                  {error && <ErrorMessage message={error} />}
                  <SubmitButton loading={loading}>Continue</SubmitButton>
                </form>
                <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath())}`} className="font-bold text-[#0B5D3B] hover:underline">Log in</Link></p>
              </div>
            )}

            {step === 2 && (
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D3B]"><ShieldCheck size={30} /></div>
                <Header eyebrow="Verify your account" title="Check your email." />
                <p className="mt-4 text-sm leading-6 text-slate-500">We sent a verification link to <strong>{form.email}</strong>. Open it, then return here to continue.</p>
                {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
                <button type="button" onClick={continueAfterVerification} disabled={loading} className="mt-8 w-full rounded-2xl bg-[#0B5D3B] px-5 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Checking..." : "I verified my email"}</button>
                <button type="button" onClick={() => sendVerificationEmail().catch((error) => setError(error instanceof Error ? error.message : "Could not resend the email."))} className="mt-5 text-sm font-semibold text-[#0B5D3B] hover:underline">Resend verification email</button>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-xl">
                <Header eyebrow="Welcome to Easy Ride" title="What brings you here?" />
                <p className="mt-4 text-center text-sm leading-6 text-slate-500">Choose your main goal. You can change or expand your account later.</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <IntentCard selected={form.intent === "buyer"} onClick={() => update("intent", "buyer")} title="Buy or Rent" description="Discover vehicles, save favorites and manage bookings." icon={<CarFront size={23} />} />
                  <IntentCard selected={form.intent === "seller"} onClick={() => update("intent", "seller")} title="Sell a Vehicle" description="List your vehicle and reach real buyers." icon={<ArrowRight size={23} />} />
                </div>
                {form.intent === "seller" && <div className="mt-5"><Field label="Phone or WhatsApp number"><input required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+263 77 123 4567" className="input" /></Field></div>}
                {error && <div className="mt-5"><ErrorMessage message={error} /></div>}
                <button type="button" onClick={finish} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5D3B] px-5 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Finishing..." : "Continue to Easy Ride"} {!loading && <ArrowRight size={17} />}</button>
                <p className="mt-5 text-center text-xs text-slate-400">You can apply to become a verified dealer later from your account.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0B5D3B]">{eyebrow}</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h2></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5D3B] px-5 py-3.5 font-bold text-white disabled:opacity-60">{loading ? "Creating account..." : children}<ArrowRight size={17} /></button>;
}

function IntentCard({ selected, onClick, title, description, icon }: { selected: boolean; onClick: () => void; title: string; description: string; icon: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-3xl border-2 p-6 text-left transition ${selected ? "border-[#0B5D3B] bg-emerald-50 shadow-lg shadow-emerald-900/5" : "border-slate-200 hover:border-slate-300"}`}><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? "bg-[#0B5D3B] text-white" : "bg-slate-100 text-slate-600"}`}>{icon}</div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>{selected && <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#0B5D3B]"><Check size={17} /> Selected</div>}</button>;
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">{icon}</div><span>{text}</span></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}
