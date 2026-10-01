"use client";

import Footer from "@/Components/Footer";
import LandingNavbar from "@/Components/LandingNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { createSupportTicket } from "@/services/supportService";
import type { SupportCategory } from "@/Types/support";
import {
  Check,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

const contactDetails = [
  {
    label: "Phone",
    value: "+263 78 656 7466",
    detail: "Mon - Fri, 8:00 AM - 6:00 PM (CAT)",
    icon: Phone,
  },
  {
    label: "Email",
    value: "info@easyride.co.zw",
    detail: "We usually reply within 24 hours.",
    icon: Mail,
  },
  {
    label: "Our office",
    value: "123 Samora Machel Ave, Harare",
    detail: "Zimbabwe",
    icon: MapPin,
  },
];

const socialLinks = ["f", "X", "◎", "▶"];

interface FormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: FormValues = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function SupportPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState<FormValues>(initialForm);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof FormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
    setError("");
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");

    try {
      if (profile) {
        await createSupportTicket({
          userId: profile.id,
          userName: form.name.trim() || profile.name,
          userEmail: form.email.trim() || profile.email,
          subject: form.subject.trim(),
          category: subjectToCategory(form.subject),
          description: `${form.message.trim()}${form.phone.trim() ? `\n\nPhone: ${form.phone.trim()}` : ""}`,
        });
      }

      setSubmitted(true);
      setForm(initialForm);
    } catch {
      setError("We could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F8F7] text-[#10222C]">
      <LandingNavbar />

      <section className="relative isolate min-h-[320px] overflow-hidden bg-[#061B24] text-white sm:min-h-[320px]">
        <Image
          src="/images/pexels-kelly-23848599.jpg"
          alt="A vehicle travelling along an open road"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,20,25,.96)_0%,rgba(3,28,34,.82)_48%,rgba(3,28,34,.2)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#061B24]/70 via-transparent to-[#061B24]/25" />
        <div className="mx-auto flex min-h-[320px] max-w-7xl items-end px-5 pb-12 pt-24 sm:px-8 sm:pb-12 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Contact us</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              We&apos;re Here to <span className="text-emerald-400">Help</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
              Have a question, need support, or want to list your vehicle? Our team is ready to assist you.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[0.9fr_1fr_0.9fr] lg:gap-6 lg:px-12">
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#079B61]">Get in touch</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Reach Out, We&apos;ll Respond</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#60727B]">
            Whether you&apos;re a buyer, seller, or just exploring, feel free to contact us through any of the channels below.
          </p>

          <div className="mt-8 space-y-6">
            {contactDetails.map(({ label, value, detail, icon: Icon }) => (
              <div key={label} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF4EA] text-[#079B61]"><Icon size={21} /></span>
                <div>
                  <p className="text-sm font-bold text-[#10222C]">{label}</p>
                  <p className="mt-1 text-sm text-[#334954]">{value}</p>
                  <p className="mt-1 text-xs text-[#809099]">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-4 border-t border-[#D9E5E1] pt-5">
            <span className="text-sm font-semibold text-[#334954]">Follow Us</span>
            <div className="flex gap-2">
              {socialLinks.map((social) => <span key={social} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10222C] text-xs font-bold text-white">{social}</span>)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E1EBE7] bg-white p-5 shadow-[0_12px_40px_rgba(21,59,47,0.08)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#079B61]">Send us a message</p>
              <h2 className="mt-2 text-2xl font-black">How Can We Help?</h2>
              <p className="mt-1 text-sm text-[#6D7F87]">Fill in the form below and we&apos;ll get back to you as soon as possible.</p>
            </div>
            <MessageSquare className="hidden shrink-0 text-[#B7E9D2] sm:block" size={25} />
          </div>

          {submitted ? (
            <div className="mt-8 rounded-xl bg-[#E6F8EF] p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#079B61] text-white"><Check size={24} /></span>
              <h3 className="mt-4 text-lg font-bold text-[#10222C]">Message sent</h3>
              <p className="mt-2 text-sm leading-6 text-[#527064]">Thanks for reaching out. Our team will be in touch soon.</p>
              <button type="button" onClick={() => setSubmitted(false)} className="mt-5 text-sm font-bold text-[#078653] hover:underline">Send another message</button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submitMessage}>
              <Field label="Full Name" required><input required className="contact-input" placeholder="Your name" value={form.name} onChange={(event) => updateField("name", event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email Address" required><input required type="email" className="contact-input" placeholder="you@example.com" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></Field>
                <Field label="Phone Number"><input type="tel" className="contact-input" placeholder="+263 77 XXX XXXX" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></Field>
              </div>
              <Field label="Subject" required><select required className="contact-input" value={form.subject} onChange={(event) => updateField("subject", event.target.value)}><option value="">Select a subject</option><option>General enquiry</option><option>Buying a vehicle</option><option>Selling or renting a vehicle</option><option>Technical support</option><option>Report a concern</option></select></Field>
              <Field label="Message" required><textarea required maxLength={500} className="contact-input min-h-32 resize-y" placeholder="Type your message here..." value={form.message} onChange={(event) => updateField("message", event.target.value)} /></Field>
              {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
              <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#08A866] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#078653] disabled:cursor-wait disabled:opacity-60"><Send size={15} />{sending ? "Sending..." : "Send Message"}</button>
            </form>
          )}
        </div>

        <aside className="overflow-hidden rounded-2xl bg-[#06202B] text-white shadow-[0_12px_40px_rgba(21,59,47,0.1)]">
          <div className="relative h-44 overflow-hidden">
            <Image src="/images/pexels-cripsdog-24018795.webp" alt="Easy Ride vehicle on the road" fill sizes="(max-width: 1024px) 100vw, 30vw" className="object-cover" />
            <div className="absolute inset-0 bg-[#06202B]/20" />
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#08A866] text-white"><MapPin size={17} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#75DDB1]">Visit us</p><h2 className="mt-1 text-xl font-black">Our Location</h2></div></div>
            <p className="mt-5 text-sm text-white/80">123 Samora Machel Ave, Harare, Zimbabwe</p>
            <div className="relative mt-5 h-36 overflow-hidden rounded-xl border border-white/10 bg-[#173844]" aria-label="Map preview of Easy Ride in Harare">
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(32deg,transparent_45%,#9eb2ae_46%,#9eb2ae_47%,transparent_48%),linear-gradient(112deg,transparent_35%,#78958e_36%,#78958e_37%,transparent_38%),linear-gradient(0deg,transparent_72%,#53736f_73%,#53736f_74%,transparent_75%)]" />
              <span className="absolute left-[52%] top-[43%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#08A866] text-white shadow-lg shadow-black/30"><MapPin size={19} fill="currentColor" /></span>
              <span className="absolute left-[57%] top-[38%] rounded bg-[#06202B]/80 px-2 py-1 text-[10px] font-semibold text-white">Easy Ride</span>
              <span className="absolute bottom-3 left-3 text-sm font-semibold text-white/60">Harare</span>
            </div>
            <Link href="https://www.google.com/maps/search/?api=1&query=123+Samora+Machel+Avenue+Harare+Zimbabwe" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">Open in Google Maps <ExternalLink size={13} /></Link>
          </div>
        </aside>
      </section>

      <section className="border-t border-[#DDE9E4] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-8 sm:px-8 lg:px-12">
          <Clock3 className="text-[#079B61]" size={21} />
          <p className="text-sm text-[#50656D]"><strong className="text-[#10222C]">Need help quickly?</strong> Our support team is available Monday to Friday, 8:00 AM - 6:00 PM CAT.</p>
          <a href="tel:+263786567466" className="ml-auto inline-flex items-center gap-2 text-sm font-bold text-[#079B61] hover:underline"><Phone size={16} /> Call us</a>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block text-[11px] font-bold text-[#334954]">{label}{required && <span className="ml-0.5 text-[#079B61]">*</span>}<span className="mt-1.5 block">{children}</span></label>;
}

function subjectToCategory(subject: string): SupportCategory {
  if (subject.toLowerCase().includes("vehicle")) return "listing";
  if (subject.toLowerCase().includes("technical")) return "technical";
  if (subject.toLowerCase().includes("concern")) return "fraud";
  return "other";
}
