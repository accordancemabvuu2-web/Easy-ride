"use client";

import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { createListing, uploadVehicleImages } from "@/services/listingService";
import { ArrowLeft, ArrowRight, CheckCircle, Car, MapPin, Phone, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

const steps = ["Type", "Car Info", "Details", "Price", "Location", "Photos", "Contact", "Review"];

export default function CreateListingPage() {
  return (
    <RequireAuth>
      <CreateListingForm />
    </RequireAuth>
  );
}

function CreateListingForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    type: "buy" as "buy" | "rent",
    make: "",
    model: "",
    year: "",
    mileage: "",
    condition: "Good",
    transmission: "Automatic" as "Automatic" | "Manual",
    price: "",
    city: "",
    country: "Zimbabwe",
    address: "",
    latitude: "",
    longitude: "",
    phone: profile?.phone ?? "",
    fuelType: "Petrol" as "Petrol" | "Diesel" | "Hybrid" | "Electric",
    bodyType: "",
    color: "",
    description: "",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const priceLabel = useMemo(
    () => (form.type === "rent" ? "per day" : undefined),
    [form.type]
  );

  const onFilesChange = async (fileList: FileList | null) => {
    const nextFiles = fileList ? Array.from(fileList) : [];
    setPhotos(nextFiles);

    if (!profile || nextFiles.length === 0) {
      setPhotoUrls([]);
      return;
    }

    try {
      setUploadingPhotos(true);
      const urls = await uploadVehicleImages(profile.id, nextFiles);
      setPhotoUrls(urls);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const ensureUploadedPhotos = async () => {
    if (!profile || photos.length === 0) {
      return photoUrls;
    }

    if (photoUrls.length === photos.length) {
      return photoUrls;
    }

    const urls = await uploadVehicleImages(profile.id, photos);
    setPhotoUrls(urls);
    return urls;
  };

  const submit = async () => {
    if (!profile) {
      toast.error("Please log in to post a vehicle.");
      return;
    }

    if (!form.make || !form.model || !form.year || !form.price || !form.city || !form.address) {
      toast.error("Please complete the required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const uploadedUrls = await ensureUploadedPhotos();

      const created = await createListing({
        ownerId: profile.id,
        ownerName: profile.name,
        ownerPhone: form.phone || profile.phone || "",
        ownerEmail: profile.email,
        listingType: form.type,
        make: form.make,
        model: form.model,
        year: Number(form.year),
        price: Number(form.price),
        currency: "USD",
        priceLabel,
        transmission: form.transmission,
        fuelType: form.fuelType,
        mileage: Number(form.mileage || 0),
        condition: form.condition as "New" | "Excellent" | "Good" | "Fair",
        bodyType: form.bodyType || undefined,
        color: form.color || undefined,
        description:
          form.description ||
          `${form.make} ${form.model} available for ${form.type === "rent" ? "rent" : "sale"} in ${form.city}.`,
        location: {
          address: form.address,
          city: form.city,
          country: form.country,
          latitude: Number(form.latitude || 0),
          longitude: Number(form.longitude || 0),
        },
        images: uploadedUrls,
        coverImage:
          uploadedUrls[0] ||
          "https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1400",
        sellerType: profile.role === "dealer" ? "Dealer" : "Private Seller",
        verified: profile.role === "dealer",
        featured: false,
      });

      toast.success(
        `Listing ${created.id} submitted for review. It will appear publicly after approval.`
      );
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be created.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[#0B5D3B]">
            <ArrowLeft size={18} /> Back
          </Link>
          <h1 className="font-bold text-[#0B5D3B]">Post Your Car</h1>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-gray-500">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>

        <div className="mt-3 h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-[#0B5D3B]"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold">What do you want to do?</h2>
              <div className="mt-6 grid gap-4">
                {[
                  { value: "buy", title: "Sell a Car", desc: "List your vehicle for sale." },
                  { value: "rent", title: "Rent a Car", desc: "Offer your vehicle for daily rental." },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => update("type", option.value)}
                    className={`rounded-2xl border p-5 text-left ${
                      form.type === option.value
                        ? "border-[#0B5D3B] bg-[#0B5D3B]/10"
                        : "border-[#E5E7EB]"
                    }`}
                  >
                    <Car className="text-[#0B5D3B]" />
                    <p className="mt-3 font-bold">{option.title}</p>
                    <p className="text-sm text-gray-500">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Car Information</h2>
              <input className="input" placeholder="Make e.g. Toyota" value={form.make} onChange={(e) => update("make", e.target.value)} />
              <input className="input" placeholder="Model e.g. Axio" value={form.model} onChange={(e) => update("model", e.target.value)} />
              <input className="input" placeholder="Year e.g. 2018" value={form.year} onChange={(e) => update("year", e.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Vehicle Details</h2>
              <input className="input" placeholder="Mileage e.g. 78000 km" value={form.mileage} onChange={(e) => update("mileage", e.target.value)} />
              <select className="input" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
                <option>New</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
              <select className="input" value={form.transmission} onChange={(e) => update("transmission", e.target.value)}>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
              <select className="input" value={form.fuelType} onChange={(e) => update("fuelType", e.target.value)}>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Hybrid</option>
                <option>Electric</option>
              </select>
              <input className="input" placeholder="Body type e.g. Sedan" value={form.bodyType} onChange={(e) => update("bodyType", e.target.value)} />
              <input className="input" placeholder="Color e.g. White" value={form.color} onChange={(e) => update("color", e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Price</h2>
              <input className="input" placeholder={priceLabel ? "Price per day e.g. 35" : "Selling price e.g. 8500"} value={form.price} onChange={(e) => update("price", e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Location</h2>
              <input className="input" placeholder="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
              <input className="input" placeholder="City e.g. Harare" value={form.city} onChange={(e) => update("city", e.target.value)} />
              <input className="input" placeholder="Country" value={form.country} onChange={(e) => update("country", e.target.value)} />

              <div className="rounded-3xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0B5D3B]">
                  <MapPin size={16} />
                  Google Maps placeholder
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Connect the Maps JavaScript API in Sprint 3. For now, capture the location manually so the listing can still be created.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input" placeholder="Latitude" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} />
                <input className="input" placeholder="Longitude" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold">Upload Photos</h2>
              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#E5E7EB] p-10 text-center">
                <Upload className="text-[#0B5D3B]" />
                <p className="mt-3 font-semibold">Click to upload photos</p>
                <p className="text-sm text-gray-500">Front, back, interior, engine</p>
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => void onFilesChange(e.target.files)} />
              </label>
              <p className="mt-4 text-sm text-gray-500">
                {photos.length} file(s) selected
              </p>
              {uploadingPhotos && (
                <p className="mt-2 text-sm font-medium text-[#0B5D3B]">
                  Uploading photos...
                </p>
              )}
              {photoUrls.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {photoUrls.map((url) => (
                    <div
                      key={url}
                      className="relative aspect-video overflow-hidden rounded-2xl bg-gray-100"
                    >
                      <Image
                        src={url}
                        alt="Selected listing photo preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Contact Information</h2>
              <div className="flex items-center gap-2 rounded-2xl bg-[#F8F9FA] p-4">
                <Phone className="text-[#0B5D3B]" />
                <input
                  className="w-full bg-transparent outline-none"
                  placeholder="WhatsApp / Phone number"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
              <textarea
                className="input min-h-[128px]"
                placeholder="Description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          )}

          {step === 7 && (
            <div>
              <CheckCircle className="text-[#0B5D3B]" size={40} />
              <h2 className="mt-4 text-2xl font-bold">Review Listing</h2>
              <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                <p><b>Type:</b> {form.type}</p>
                <p><b>Car:</b> {form.make} {form.model} {form.year}</p>
                <p><b>Price:</b> USD {form.price}</p>
                <p><b>Location:</b> {form.city}</p>
                <p><b>Contact:</b> {form.phone}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          {step > 0 ? (
            <button onClick={back} className="rounded-full border border-[#E5E7EB] px-5 py-3 font-semibold">
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white"
            >
              Next <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => void submit()}
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-[#C9A227] px-6 py-3 font-bold text-[#121212] disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              Submit Listing
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
