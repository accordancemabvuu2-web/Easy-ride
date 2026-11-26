"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import {
  getListingById,
  removeVehicleImage,
  reorderVehicleImages,
  saveSellerListingDraft,
  submitSellerListingDraft,
  SellerListingImageUploadError,
  type SellerListingFormValues,
  uploadSellerDraftPhotos,
  validateSellerListingForm,
  getMyDrafts,
} from "@/services/sellerListingWorkflow";
import type { ListingType, Vehicle } from "@/Types/vehicle";
import { ArrowLeft, ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cloneElement, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ListingPhoto {
  file: File;
  previewUrl: string;
}

const emptyForm: SellerListingFormValues = {
  listingType: "buy",
  make: "",
  model: "",
  trim: "",
  year: "",
  condition: "Good",
  mileage: "",
  mileageUnit: "km",
  transmission: "Automatic",
  fuelType: "Petrol",
  bodyType: "",
  color: "",
  interiorColor: "",
  drivetrain: "",
  engineCapacity: "",
  negotiable: false,
  price: "",
  dailyRentalPrice: "",
  currency: "USD",
  city: "",
  country: "Zimbabwe",
  address: "",
  latitude: "",
  longitude: "",
  description: "",
  features: "",
};

export default function SellerListingCreatePage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["seller", "dealer", "admin"]} label="Seller">
        <SellerListingCreateContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function SellerListingCreateContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savedImages, setSavedImages] = useState<NonNullable<Vehicle["imageRecords"]>>([]);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Vehicle[]>([]);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  useEffect(() => {
    if (!profile || typeof window === "undefined") return;
    void getMyDrafts().then(setDrafts).catch(() => setDrafts([]));
    const id = new URLSearchParams(window.location.search).get("draftId");
    if (!id) return;
    let cancelled = false;
    setLoadingDraft(true);
    void getListingById(id).then((listing) => {
      if (cancelled) return;
      if (!listing || listing.status !== "draft") {
        toast.error("That draft could not be found in your inventory.");
        router.replace("/dashboard/seller/listings/new");
        return;
      }
      setDraftId(listing.id);
      setSavedImages(listing.imageRecords ?? []);
      setForm({
        listingType: listing.listingType,
        make: listing.make === "Unknown make" ? "" : listing.make,
        model: listing.model === "Unknown model" ? "" : listing.model,
        trim: listing.trim ?? "",
        year: listing.year > 0 ? String(listing.year) : "",
        condition: listing.condition,
        mileage: listing.mileage ? String(listing.mileage) : "",
        mileageUnit: listing.mileageUnit ?? "km",
        transmission: listing.transmission,
        fuelType: listing.fuelType,
        bodyType: listing.bodyType ?? "",
        color: listing.color ?? "",
        interiorColor: listing.interiorColor ?? "",
        drivetrain: listing.drivetrain ?? "",
        engineCapacity: listing.engineCapacity === undefined ? "" : String(listing.engineCapacity),
        negotiable: listing.negotiable ?? false,
        price: listing.listingType === "rent" ? "" : listing.salePrice !== undefined ? String(listing.salePrice) : "",
        dailyRentalPrice: listing.rentalPricing?.day !== undefined ? String(listing.rentalPricing.day) : "",
        currency: listing.currency || "USD",
        city: listing.location.city,
        country: listing.location.country,
        address: listing.location.address,
        latitude: listing.location.latitude ? String(listing.location.latitude) : "",
        longitude: listing.location.longitude ? String(listing.location.longitude) : "",
        description: listing.description,
        features: listing.features?.join(", ") ?? "",
      });
    }).catch((error) => {
      if (!cancelled) toast.error(error instanceof Error ? error.message : "Draft could not be loaded.");
    }).finally(() => {
      if (!cancelled) setLoadingDraft(false);
    });
    return () => { cancelled = true; };
  }, [profile, router]);

  const update = <K extends keyof SellerListingFormValues>(key: K, value: SellerListingFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error("Choose JPEG, PNG or WebP photos no larger than 5 MiB each.");
      return;
    }
    if (savedImages.length + photos.length + selected.length > 10) {
      toast.error("A listing can have up to 10 photos.");
      return;
    }
    const added = selected.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.add(previewUrl);
      return { file, previewUrl };
    });
    setPhotos((current) => [...current, ...added]);
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
      objectUrls.current.delete(photo.previewUrl);
    }
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= photos.length) return;
    setPhotos((current) => {
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex]!, reordered[index]!];
      return reordered;
    });
  };

  const finishAfterUpload = () => {
    toast.success("Listing submitted for administrator review.");
    router.push("/dashboard/seller");
  };

  const refreshSavedImages = async (listingId: string) => {
    const listing = await getListingById(listingId);
    if (listing?.status === "draft") setSavedImages(listing.imageRecords ?? []);
  };

  const uploadSelectedPhotos = async (listingId: string) => {
    if (!photos.length) return;
    setUploadingPhotos(true);
    await uploadSellerDraftPhotos(listingId, photos.map((photo) => photo.file), savedImages.length);
    photos.forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl);
      objectUrls.current.delete(photo.previewUrl);
    });
    setPhotos([]);
    await refreshSavedImages(listingId);
  };

  const retryPhotos = async () => {
    if (!draftId || photos.length === 0) return;
    try {
      setSubmitting(true);
      await uploadSelectedPhotos(draftId);
      setUploadErrorMessage(null);
      toast.success("Draft photos uploaded successfully.");
    } catch (error) {
      setUploadErrorMessage(error instanceof Error ? error.message : "Photo upload failed. Please try again later.");
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const errors = validateSellerListingForm(form);
    setValidationErrors(errors);
    if (errors.length) return;
    setSubmitting(true);
    setUploadErrorMessage(null);
    try {
      const id = await saveSellerListingDraft(form, draftId ?? undefined);
      setDraftId(id);
      router.replace(`/dashboard/seller/listings/new?draftId=${encodeURIComponent(id)}`);
      const latestDraft = await getListingById(id);
      if (latestDraft) setDrafts((current) => [latestDraft, ...current.filter((draft) => draft.id !== id)]);
      await uploadSelectedPhotos(id);
      await submitSellerListingDraft(id);
      finishAfterUpload();
    } catch (error) {
      if (error instanceof SellerListingImageUploadError) {
        setDraftId(error.listingId);
        router.replace(`/dashboard/seller/listings/new?draftId=${encodeURIComponent(error.listingId)}`);
        const cause = error.uploadError;
        const message = cause instanceof Error ? cause.message : "The upload service did not accept the photos.";
        setUploadErrorMessage(message);
        toast.error("The draft was saved, but its photos could not be uploaded. Retry without losing the listing.");
      } else {
        toast.error(error instanceof Error ? error.message : "Listing could not be submitted.");
      }
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const saveDraft = async () => {
    if (!profile) return;
    setSubmitting(true);
    setUploadErrorMessage(null);
    try {
      const id = await saveSellerListingDraft(form, draftId ?? undefined);
      setDraftId(id);
      router.replace(`/dashboard/seller/listings/new?draftId=${encodeURIComponent(id)}`);
      const latestDraft = await getListingById(id);
      if (latestDraft) setDrafts((current) => [latestDraft, ...current.filter((draft) => draft.id !== id)]);
      await uploadSelectedPhotos(id);
      toast.success("Draft saved. You can resume it from your seller dashboard.");
    } catch (error) {
      if (error instanceof SellerListingImageUploadError) {
        setDraftId(error.listingId);
        router.replace(`/dashboard/seller/listings/new?draftId=${encodeURIComponent(error.listingId)}`);
        const cause = error.uploadError;
        const message = cause instanceof Error ? cause.message : "Photo upload failed.";
        setUploadErrorMessage(message);
        toast.error("The draft was saved, but photo upload needs to be retried.");
      } else {
        toast.error(error instanceof Error ? error.message : "Draft could not be saved.");
      }
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const moveSavedImage = async (index: number, direction: -1 | 1) => {
    if (!draftId) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= savedImages.length) return;
    const reordered = [...savedImages];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex]!, reordered[index]!];
    if (reordered.some((image) => !image.id)) {
      toast.error("This stored image cannot be reordered safely.");
      return;
    }
    try {
      await reorderVehicleImages(draftId, reordered.map((image) => image.id));
      setSavedImages(reordered.map((image, displayOrder) => ({ ...image, displayOrder })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image order could not be saved.");
    }
  };

  const removeSavedImage = async (imageId: string) => {
    if (!draftId) return;
    try {
      await removeVehicleImage(draftId, imageId);
      setSavedImages((current) => current.filter((image) => image.id !== imageId));
      toast.success("Draft photo removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo could not be removed.");
    }
  };

  const setListingType = (value: string) => update("listingType", value as ListingType);

  return (
    <DashboardShell role="seller">
      <main className="mx-auto max-w-5xl pb-12">
        <Link href="/dashboard/seller" className="inline-flex items-center gap-2 text-sm font-bold text-[#08784D] hover:underline">
          <ArrowLeft size={17} /> Back to seller dashboard
        </Link>
        <header className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#08784D]">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{draftId ? "Resume vehicle draft" : "Create a vehicle listing"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">Save privately as you work, then submit the completed listing for administrator review.</p>
        </header>

        {loadingDraft && <div role="status" className="mt-5 text-sm text-gray-600">Loading saved draft…</div>}
        {drafts.filter((draft) => draft.id !== draftId).length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#DCE5DF] bg-white p-5">
            <h2 className="font-black">Resume a saved draft</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {drafts.filter((draft) => draft.id !== draftId).map((draft) => (
                <li key={draft.id}>
                  <Link href={`/dashboard/seller/listings/new?draftId=${encodeURIComponent(draft.id)}`} className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#063F2C] hover:bg-emerald-100">
                    {draft.make === "Unknown make" ? "Vehicle" : draft.make} {draft.model === "Unknown model" ? "draft" : draft.model}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {draftId && (
          <section role="status" className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="font-black text-amber-950">Draft {draftId} is saved privately</h2>
            <p className="mt-1 text-sm text-amber-900">Your draft remains in your inventory until you submit it for review.</p>
            {uploadErrorMessage && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">Photo upload failed: {uploadErrorMessage}</p>}
            {photos.length > 0 && <button type="button" onClick={() => void retryPhotos()} disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#063F2C] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting && <Loader2 size={16} className="animate-spin" />} Retry photo upload</button>}
            {uploadingPhotos && <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-amber-900">Uploading {photos.length} photo{photos.length === 1 ? "" : "s"}…</p>}
          </section>
        )}

        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-6">
          <fieldset disabled={submitting || loadingDraft} className="space-y-6 disabled:opacity-75">
            <section className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Listing type</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {([ ["buy", "For sale"], ["rent", "For rent"], ["both", "Sale or rent"] ] as const).map(([value, label]) => (
                  <label key={value} className={`cursor-pointer rounded-2xl border p-4 font-bold ${form.listingType === value ? "border-[#08784D] bg-emerald-50 text-[#063F2C]" : "border-[#DCE5DF]"}`}>
                    <input type="radio" name="listingType" value={value} checked={form.listingType === value} onChange={() => setListingType(value)} className="mr-2 accent-[#08784D]" />{label}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Vehicle details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Make" required><input required maxLength={80} value={form.make} onChange={(event) => update("make", event.target.value)} /></Field>
                <Field label="Model" required><input required maxLength={80} value={form.model} onChange={(event) => update("model", event.target.value)} /></Field>
                <Field label="Trim"><input maxLength={80} value={form.trim} onChange={(event) => update("trim", event.target.value)} /></Field>
                <Field label="Year" required><input required type="number" min={1886} max={new Date().getFullYear() + 1} step={1} value={form.year} onChange={(event) => update("year", event.target.value)} /></Field>
                <Field label="Condition" required><select value={form.condition} onChange={(event) => update("condition", event.target.value as Vehicle["condition"])}><option>New</option><option>Excellent</option><option>Good</option><option>Fair</option></select></Field>
                <Field label="Mileage (km or mi)"><input type="number" min={0} step={1} value={form.mileage} onChange={(event) => update("mileage", event.target.value)} /></Field>
                <Field label="Mileage unit"><select value={form.mileageUnit ?? "km"} onChange={(event) => update("mileageUnit", event.target.value as "km" | "mi")}><option value="km">Kilometres</option><option value="mi">Miles</option></select></Field>
                <Field label="Transmission"><select value={form.transmission} onChange={(event) => update("transmission", event.target.value as Vehicle["transmission"])}><option>Automatic</option><option>Manual</option></select></Field>
                <Field label="Fuel type"><select value={form.fuelType} onChange={(event) => update("fuelType", event.target.value as Vehicle["fuelType"])}><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></Field>
                <Field label="Body type"><input maxLength={60} value={form.bodyType} onChange={(event) => update("bodyType", event.target.value)} /></Field>
                <Field label="Exterior colour"><input maxLength={60} value={form.color} onChange={(event) => update("color", event.target.value)} /></Field>
                <Field label="Interior colour"><input maxLength={60} value={form.interiorColor} onChange={(event) => update("interiorColor", event.target.value)} /></Field>
                <Field label="Drivetrain"><input maxLength={60} value={form.drivetrain} onChange={(event) => update("drivetrain", event.target.value)} /></Field>
                <Field label="Engine capacity (cc)"><input type="number" min={0} step="any" value={form.engineCapacity} onChange={(event) => update("engineCapacity", event.target.value)} /></Field>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.negotiable} onChange={(event) => update("negotiable", event.target.checked)} className="h-4 w-4 accent-[#08784D]" /> Price is negotiable</label>
                <Field label="Features" hint="Separate features with commas"><input value={form.features} onChange={(event) => update("features", event.target.value)} /></Field>
              </div>
            </section>

            <section className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Price and location</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {form.listingType !== "rent" && <Field label="Sale price" required><input required type="number" min={0} step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} /></Field>}
                {(form.listingType === "rent" || form.listingType === "both") && <Field label="Daily rental price" required><input required type="number" min={0} step="0.01" value={form.dailyRentalPrice} onChange={(event) => update("dailyRentalPrice", event.target.value)} /></Field>}
                <Field label="Currency" required><select value={form.currency} onChange={(event) => update("currency", event.target.value)}><option value="USD">USD</option><option value="ZAR">ZAR</option><option value="BWP">BWP</option><option value="ZMW">ZMW</option><option value="MWK">MWK</option></select></Field>
                <Field label="City" required><input required maxLength={80} value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
                <Field label="Country" required><input required maxLength={80} value={form.country} onChange={(event) => update("country", event.target.value)} /></Field>
                <Field label="Address or viewing area"><input maxLength={300} value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
                <Field label="Latitude" hint="Optional; provide both coordinates"><input type="number" min={-90} max={90} step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} /></Field>
                <Field label="Longitude" hint="Optional; provide both coordinates"><input type="number" min={-180} max={180} step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></Field>
              </div>
            </section>

            <section className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Description</h2>
              <label className="mt-4 block text-sm font-semibold">Vehicle description <span aria-hidden="true">*</span><textarea required minLength={1} maxLength={12000} rows={6} value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-2 min-h-36 w-full rounded-xl border border-[#C9D6CE] p-3 outline-none focus:border-[#08784D]" /></label>
            </section>

            <section className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3"><ImagePlus className="mt-1 text-[#08784D]" /><div><h2 className="text-xl font-black">Vehicle photos</h2><p className="mt-1 text-sm text-gray-600">Up to 10 JPEG, PNG or WebP images, 5 MiB each. Photos upload to the backend storage service.</p></div></div>
              <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#C9D6CE] p-6 text-center font-bold text-[#08784D] hover:bg-emerald-50"><Upload size={19} /> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label>
              <p className="mt-3 text-sm text-gray-500">{savedImages.length + photos.length} of 10 photos. The first item is the cover image.</p>
              {savedImages.length > 0 && <ol aria-label="Saved draft photos" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{savedImages.map((image, index) => <li key={image.id || image.imageUrl} className="overflow-hidden rounded-2xl border border-[#DCE5DF]"><div className="relative aspect-video bg-gray-100"><img src={image.imageUrl} alt={`Saved vehicle photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">{index === 0 ? "Cover" : `Photo ${index + 1}`}</span></div><div className="flex items-center justify-between gap-2 p-2"><span className="text-xs text-gray-600">Uploaded photo</span><div className="flex gap-1"><button type="button" disabled={index === 0 || submitting} aria-label={`Move saved photo ${index + 1} earlier`} onClick={() => void moveSavedImage(index, -1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={16} /></button><button type="button" disabled={index === savedImages.length - 1 || submitting} aria-label={`Move saved photo ${index + 1} later`} onClick={() => void moveSavedImage(index, 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={16} /></button>{image.id && <button type="button" disabled={submitting} aria-label={`Remove saved photo ${index + 1}`} onClick={() => void removeSavedImage(image.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} /></button>}</div></div></li>)}</ol>}
              {photos.length > 0 && <ol aria-label="Selected vehicle photos" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo, index) => { const isCover = savedImages.length === 0 && index === 0; const photoNumber = savedImages.length + index + 1; return <li key={photo.previewUrl} className="overflow-hidden rounded-2xl border border-[#DCE5DF]"><div className="relative aspect-video bg-gray-100"><Image src={photo.previewUrl} alt={`Selected vehicle photo ${photoNumber}`} fill unoptimized className="object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">{isCover ? "Cover" : `Photo ${photoNumber}`}</span></div><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs text-gray-600">{photo.file.name}</span><div className="flex shrink-0 gap-1"><button type="button" disabled={index === 0 || submitting} aria-label={`Move selected photo ${photoNumber} earlier`} onClick={() => movePhoto(index, -1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"><ArrowUp size={16} /></button><button type="button" disabled={index === photos.length - 1 || submitting} aria-label={`Move selected photo ${photoNumber} later`} onClick={() => movePhoto(index, 1)} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-40"><ArrowDown size={16} /></button><button type="button" disabled={submitting} aria-label={`Remove selected photo ${photoNumber}`} onClick={() => removePhoto(index)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} /></button></div></div></li>; })}</ol>}
            </section>
          </fieldset>

          <section className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Contact details:</strong> buyer-facing seller or dealership contact information comes from your verified backend profile. This form does not publish private account fields.</section>
          {validationErrors.length > 0 && <ul role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveDraft()} disabled={submitting || loadingDraft} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#08784D] px-6 py-4 font-bold text-[#08784D] disabled:opacity-60">{submitting && !uploadingPhotos ? <Loader2 size={18} className="animate-spin" /> : null}Save draft</button>
            <button type="submit" disabled={submitting || loadingDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E7B319] px-6 py-4 font-black text-[#17201D] shadow-sm hover:bg-[#F4C83D] disabled:cursor-wait disabled:opacity-60 sm:w-auto">{submitting && <Loader2 size={18} className="animate-spin" />}{uploadingPhotos ? "Uploading photos…" : submitting ? "Submitting listing…" : "Submit for review"}</button>
          </div>
        </form>
      </main>
    </DashboardShell>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactElement<{ className?: string }> }) {
  return <label className="block text-sm font-semibold">{label}{required && <span aria-hidden="true"> *</span>}{hint && <span className="ml-1 font-normal text-gray-500">({hint})</span>}{cloneElement(children, { className: "mt-2 w-full rounded-xl border border-[#C9D6CE] bg-white p-3 outline-none focus:border-[#08784D]" })}</label>;
}
