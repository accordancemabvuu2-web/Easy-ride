"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { createListing, saveListingDraft, updateListingStatus, uploadVehicleImages } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CircleCheck, Loader2, Save, Tag, UploadCloud, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const steps = ["Vehicle details", "Photos", "Pricing & availability", "Review & publish"];
const draftKey = (userId: string) => `easy-ride:seller-listing-draft:${userId}`;
type ListingForm = {
  type: "buy" | "rent"; make: string; model: string; year: string; mileage: string;
  condition: Vehicle["condition"]; transmission: Vehicle["transmission"]; price: string;
  city: string; country: string; address: string; latitude: string; longitude: string;
  phone: string; fuelType: Vehicle["fuelType"]; bodyType: string; color: string; description: string;
};
const blankForm = (phone = ""): ListingForm => ({ type: "buy", make: "", model: "", year: "", mileage: "", condition: "Good", transmission: "Automatic", price: "", city: "", country: "Zimbabwe", address: "", latitude: "", longitude: "", phone, fuelType: "Petrol", bodyType: "", color: "", description: "" });

export default function CreateListingPage() {
  return <RequireAuth><RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller"><CreateListingForm /></RoleGuard></RequireAuth>;
}

function CreateListingForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingForm>(() => blankForm());
  const [draftId, setDraftId] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const storageKey = profile ? draftKey(profile.id) : "";

  useEffect(() => {
    if (!profile) return;
    try {
      const raw = window.localStorage.getItem(draftKey(profile.id));
      if (raw) {
        const saved = JSON.parse(raw) as { form?: ListingForm; step?: number; id?: string; photos?: string[] };
        if (saved.form) setForm({ ...blankForm(profile.phone ?? ""), ...saved.form });
        if (typeof saved.step === "number") setStep(Math.min(3, Math.max(0, saved.step)));
        setDraftId(saved.id);
        setPhotoUrls(saved.photos ?? []);
      } else {
        setForm((current) => ({ ...current, phone: profile.phone ?? current.phone }));
      }
    } catch { setForm((current) => ({ ...current, phone: profile.phone ?? current.phone })); }
    setReady(true);
  }, [profile]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("type") === "rent") {
      setForm((current) => ({ ...current, type: "rent" }));
    }
  }, []);

  useEffect(() => {
    if (!ready || !storageKey) return;
    const timeout = window.setTimeout(() => {
      const persistedPhotos = photoUrls.filter((url) => !url.startsWith("data:"));
      try { window.localStorage.setItem(storageKey, JSON.stringify({ form, step, id: draftId, photos: persistedPhotos })); } catch { /* Keep the current form usable if browser storage is full. */ }
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [draftId, form, photoUrls, ready, step, storageKey]);

  const update = <K extends keyof ListingForm>(field: K, value: ListingForm[K]) => setForm((current) => ({ ...current, [field]: value }));
  const priceLabel = useMemo(() => form.type === "rent" ? "per day" : "asking price", [form.type]);

  const payload = useCallback((imageList: string[]): Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt"> => ({
    ownerId: profile?.id ?? "local-guest", ownerName: profile?.name ?? "Guest Seller", ownerPhone: form.phone || profile?.phone || "", ownerEmail: profile?.email ?? "",
    listingType: form.type, make: form.make.trim(), model: form.model.trim(), year: Number(form.year), price: Number(form.price), currency: "USD", priceLabel: form.type === "rent" ? "per day" : undefined,
    transmission: form.transmission, fuelType: form.fuelType, mileage: Number(form.mileage || 0), condition: form.condition, bodyType: form.bodyType || undefined, color: form.color || undefined,
    description: form.description.trim() || `${form.year} ${form.make} ${form.model} available for ${form.type === "rent" ? "rent" : "sale"} in ${form.city}.`,
    location: { address: form.address.trim(), city: form.city.trim(), country: form.country.trim(), latitude: Number(form.latitude || 0), longitude: Number(form.longitude || 0) },
    images: imageList, coverImage: imageList[0] || "https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1400",
    sellerType: profile?.role === "dealer" ? "Dealer" : "Private Seller", verified: profile?.role === "dealer", featured: false,
  }), [form, profile]);

  const onFiles = async (fileList: FileList | null) => {
    const selected = fileList ? Array.from(fileList).slice(0, 10) : [];
    if (!profile) { toast.error("Sign in before adding vehicle photos."); return; }
    setPhotos(selected);
    if (!selected.length) { setPhotoUrls([]); return; }
    try { setUploading(true); setPhotoUrls(await uploadVehicleImages(profile.id, selected)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Photo upload failed."); }
    finally { setUploading(false); }
  };

  const saveDraft = async () => {
    if (!profile) { toast.error("Sign in to save your listing draft."); return; }
    try {
      const saved = await saveListingDraft(payload(photoUrls), draftId);
      setDraftId(saved.id);
      const persistedPhotos = photoUrls.filter((url) => !url.startsWith("data:"));
      try { window.localStorage.setItem(storageKey, JSON.stringify({ form, step, id: saved.id, photos: persistedPhotos })); } catch { /* Draft is also stored in the listings store. */ }
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success("Draft saved to your inventory.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Draft could not be saved."); }
  };

  const continueStep = () => {
    if (step === 0 && (!form.make.trim() || !form.model.trim() || !form.year || Number(form.year) < 1900 || Number(form.year) > new Date().getFullYear() + 1)) { toast.error("Add a valid make, model, and year first."); return; }
    if (step === 2 && (!form.price || Number(form.price) <= 0 || !form.city.trim() || !form.address.trim())) { toast.error("Add a valid price and vehicle location first."); return; }
    setStep((current) => Math.min(3, current + 1));
  };

  const submit = async () => {
    if (!profile) { toast.error("Sign in before publishing a vehicle."); return; }
    try {
      setSubmitting(true);
      let images = photoUrls;
      if (photos.length && photoUrls.length !== photos.length) images = await uploadVehicleImages(profile.id, photos);
      const created = draftId
        ? await saveListingDraft(payload(images), draftId)
        : await createListing(payload(images));
      if (draftId) await updateListingStatus(created.id, "pending");
      window.localStorage.removeItem(storageKey);
      toast.success(`${created.make} ${created.model} sent for review.`);
      router.push("/dashboard/seller/inventory");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Listing could not be created."); }
    finally { setSubmitting(false); }
  };

  return <DashboardShell role="seller"><div className="mx-auto max-w-[1440px]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Seller studio <span className="mx-2">/</span>Add vehicle</p><h1 className="mt-2 text-4xl font-black">Add a vehicle</h1><p className="mt-2 text-slate-600">Create a complete listing and reach ready-to-buy shoppers.</p></div><div className="flex items-center gap-3">{savedAt&&<span className="hidden text-xs text-slate-500 sm:inline">Autosaved {savedAt}</span>}<button onClick={()=>void saveDraft()} className="rounded-xl border border-emerald-800 bg-white px-4 py-3 text-sm font-bold text-emerald-900"><Save className="mr-2 inline" size={17}/>Save draft</button></div></header>
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0"><div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><div className="grid grid-cols-4 gap-2">{steps.map((label,index)=><button key={label} onClick={()=>index<step&&setStep(index)} className="text-left"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${index===step?"bg-[#063F2C] text-white":index<step?"bg-emerald-100 text-emerald-900":"border border-slate-200 text-slate-500"}`}>{index<step?<Check size={17}/>:index+1}</span><span className={`mt-2 block text-xs font-bold sm:text-sm ${index===step?"text-[#063F2C]":"text-slate-500"}`}>{label}</span></button>)}</div><div className="mt-4 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-700 transition-all" style={{width:`${((step+1)/4)*100}%`}}/></div>
      <div className="mt-7 min-h-[400px]">{step===0&&<section><h2 className="text-2xl font-black">Tell us about your vehicle</h2><p className="mt-1 text-sm text-slate-500">Provide accurate details to attract the right buyers.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Listing type<select className="input mt-1" value={form.type} onChange={(event)=>update("type",event.target.value as ListingForm["type"])}><option value="buy">For sale</option><option value="rent">For rent</option></select></label><Field label="Make *" value={form.make} onChange={(value)=>update("make",value)} placeholder="e.g. Toyota"/><Field label="Model *" value={form.model} onChange={(value)=>update("model",value)} placeholder="e.g. RAV4"/><Field label="Trim" value={form.color} onChange={(value)=>update("color",value)} placeholder="e.g. Hybrid XLE"/><Field label="Year *" value={form.year} onChange={(value)=>update("year",value)} type="number" placeholder="2022"/><Field label="Mileage (km)" value={form.mileage} onChange={(value)=>update("mileage",value)} type="number" placeholder="42,300"/><label className="field-label">Condition<select className="input mt-1" value={form.condition} onChange={(event)=>update("condition",event.target.value as Vehicle["condition"])}>{["New","Excellent","Good","Fair"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="field-label">Body type<select className="input mt-1" value={form.bodyType} onChange={(event)=>update("bodyType",event.target.value)}><option value="">Choose body type</option>{["SUV","Sedan","Hatchback","Pickup","Van","Coupe","Wagon"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="field-label">Fuel type<select className="input mt-1" value={form.fuelType} onChange={(event)=>update("fuelType",event.target.value as Vehicle["fuelType"])}>{["Petrol","Diesel","Hybrid","Electric"].map((value)=><option key={value}>{value}</option>)}</select></label><label className="field-label">Transmission<select className="input mt-1" value={form.transmission} onChange={(event)=>update("transmission",event.target.value as Vehicle["transmission"])}><option>Automatic</option><option>Manual</option></select></label><Field label="City *" value={form.city} onChange={(value)=>update("city",value)} placeholder="Harare"/><Field label="Country" value={form.country} onChange={(value)=>update("country",value)} placeholder="Zimbabwe"/><Field label="Pickup / viewing address *" value={form.address} onChange={(value)=>update("address",value)} placeholder="Area or street address"/></div></section>}
      {step===1&&<section><h2 className="text-2xl font-black">Show buyers your vehicle</h2><p className="mt-1 text-sm text-slate-500">Clear photos help shoppers understand the vehicle’s condition.</p><label className="mt-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center"><UploadCloud className="text-emerald-800" size={34}/><b className="mt-3">Choose vehicle photos</b><span className="mt-1 text-sm text-slate-500">Add up to 10 photos · JPG, PNG, or WebP</span><input type="file" multiple accept="image/*" className="hidden" onChange={(event)=>void onFiles(event.target.files)}/></label>{uploading&&<p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800"><Loader2 className="animate-spin" size={16}/>Uploading photos…</p>}<p className="mt-3 text-sm font-semibold text-slate-600">{photoUrls.length} photos added</p>{photoUrls.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{photoUrls.map((url,index)=><div key={`${url}-${index}`} className="relative aspect-video overflow-hidden rounded-xl bg-slate-100"><Image src={url} alt={`Vehicle photo ${index+1}`} fill className="object-cover" unoptimized/><button type="button" onClick={()=>setPhotoUrls((current)=>current.filter((_,i)=>i!==index))} className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-bold">Remove</button></div>)}</div>}</section>}
      {step===2&&<section><h2 className="text-2xl font-black">Set pricing and availability</h2><p className="mt-1 text-sm text-slate-500">Choose a clear price and give shoppers the details they need.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={form.type==="rent"?"Daily rental price *":"Asking price *"} value={form.price} onChange={(value)=>update("price",value)} type="number" placeholder={form.type==="rent"?"35":"32900"}/><div className="flex items-end pb-3 text-sm font-semibold text-slate-500">USD {priceLabel}</div><label className="field-label sm:col-span-2">Description<textarea className="input mt-1 min-h-32" maxLength={1200} value={form.description} onChange={(event)=>update("description",event.target.value)} placeholder="Describe condition, features, service history, and anything a buyer should know."/></label><Field label="Contact phone" value={form.phone} onChange={(value)=>update("phone",value)} placeholder="WhatsApp / phone number"/><div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><BadgeCheck className="mr-2 inline" size={18}/>Your phone is shared only with interested buyers.</div></div></section>}
      {step===3&&<section><CircleCheck className="text-emerald-700" size={38}/><h2 className="mt-3 text-2xl font-black">Review your listing</h2><p className="mt-1 text-sm text-slate-500">Check these details before sending the listing for review.</p><div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]"><div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100">{(photoUrls[0]||"https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1400")&&<Image src={photoUrls[0]||"https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1400"} alt={`${form.make} ${form.model}`} fill className="object-cover" unoptimized/>}</div><div><p className="text-xl font-black">{form.year} {form.make} {form.model}</p><p className="mt-1 text-sm text-slate-500">{form.type==="rent"?"Rental listing":"For sale"} · {form.city}, {form.country}</p><p className="mt-4 text-2xl font-black text-emerald-900">USD {Number(form.price||0).toLocaleString()} <span className="text-sm font-semibold text-slate-500">{form.type==="rent"?"/ day":""}</span></p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">{[`${Number(form.mileage||0).toLocaleString()} km`,form.fuelType,form.bodyType||"Body type not set",form.transmission].map((value)=><span key={value} className="rounded-full bg-slate-100 px-3 py-1.5">{value}</span>)}</div><p className="mt-4 text-sm leading-6 text-slate-600">{form.description||"Add a vehicle description to help shoppers understand this listing."}</p></div></div><div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">After you submit, the listing goes to review. You can track it from your Inventory tab.</div></section>}</div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><div>{step>0&&<button onClick={()=>setStep((current)=>Math.max(0,current-1))} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold"><ArrowLeft className="mr-2 inline" size={17}/>Back</button>}</div>{step<3?<button disabled={uploading} onClick={continueStep} className="rounded-xl bg-[#063F2C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Continue <ArrowRight className="ml-2 inline" size={17}/></button>:<button disabled={submitting||uploading} onClick={()=>void submit()} className="rounded-xl bg-[#063F2C] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting?<Loader2 className="mr-2 inline animate-spin" size={17}/>:<Check className="mr-2 inline" size={17}/>}Submit for review</button>}</div>
    </div></div><aside className="space-y-4"><section className="rounded-2xl border border-emerald-100 bg-[#F1FAF5] p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Listing quality</p><h2 className="mt-1 text-xl font-black">{qualityScore(form,photoUrls.length)}% complete</h2></div><span className="grid h-14 w-14 place-items-center rounded-full border-4 border-emerald-600 text-sm font-black text-emerald-900">{qualityScore(form,photoUrls.length)}</span></div><div className="mt-4 space-y-3">{[[Boolean(form.make&&form.model&&form.year),"Vehicle details complete"],[photoUrls.length>=3,"Add at least 3 photos"],[Boolean(form.price),"Set a competitive price"],[Boolean(form.description),"Add a description"]].map(([done,label])=><p key={String(label)} className="flex items-center gap-2 text-sm"><span className={`grid h-5 w-5 place-items-center rounded-full ${done?"bg-emerald-600 text-white":"border border-slate-300 text-transparent"}`}>{done?<Check size={13}/>:"·"}</span>{label}</p>)}</div><p className="mt-4 rounded-lg bg-amber-100 p-3 text-xs font-semibold text-amber-900">Complete listings help shoppers make confident decisions.</p></section><section className="rounded-2xl bg-[#063F2C] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Sell smarter with Easy Ride</p><h2 className="mt-2 text-xl font-black">Reach more buyers</h2><div className="mt-5 space-y-4 text-sm"><p><Users className="mr-2 inline text-emerald-200" size={18}/>Secure buyer messaging</p><p><BadgeCheck className="mr-2 inline text-emerald-200" size={18}/>Clear listing review</p><p><Tag className="mr-2 inline text-emerald-200" size={18}/>Manage offers in one place</p></div></section><Link href="/dashboard/seller/inventory" className="block rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-bold text-slate-700">Back to inventory</Link></aside></div>
  </div></DashboardShell>;
}

function Field({label,value,onChange,type="text",placeholder=""}:{label:string;value:string;onChange:(value:string)=>void;type?:string;placeholder?:string}) { return <label className="field-label">{label}<input className="input mt-1" type={type} value={value} onChange={(event)=>onChange(event.target.value)} placeholder={placeholder}/></label>; }
function qualityScore(form:ListingForm,photos:number) { let score=0;if(form.make&&form.model&&form.year)score+=30;if(photos>=3)score+=25;else if(photos)score+=10;if(form.price)score+=20;if(form.description)score+=15;if(form.city&&form.address)score+=10;return score; }
