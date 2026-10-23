"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LockKeyhole, X } from "lucide-react";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function LoginPromptModal({
  open,
  onClose,
  description = "Log in to save this vehicle or contact its seller.",
}: {
  open: boolean;
  onClose: () => void;
  description?: string;
}) {
  const { login, loginWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await login(email, password);
      toast.success("Welcome back.");
      onClose();
    } catch {
      toast.error("Incorrect email address or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const googleLogin = async () => {
    try {
      setSubmitting(true);
      await loginWithGoogle();
      toast.success("Welcome back.");
      onClose();
    } catch {
      toast.error("Google login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <button type="button" aria-label="Close login form" onClick={onClose} disabled={submitting} className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B5D3B] text-white"><LockKeyhole /></div>
        <h2 id="login-prompt-title" className="mt-5 text-2xl font-bold">Log in to continue</h2>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="Email address" />
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" placeholder="Password" />
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-3.5 font-bold text-white disabled:opacity-60">
            {submitting && <Loader2 className="animate-spin" size={18} />} Log In
          </button>
        </form>
        <button type="button" onClick={googleLogin} disabled={submitting} className="mt-3 w-full rounded-full border border-[#E5E7EB] px-6 py-3.5 font-semibold disabled:opacity-60">Continue with Google</button>
        <p className="mt-5 text-center text-sm text-gray-500">New to Easy Ride? <a href={`/register?next=${encodeURIComponent(window.location.pathname)}`} className="font-bold text-[#0B5D3B] hover:underline">Create an account</a></p>
      </section>
    </div>
  );
}
