"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Car,
  MapPin,
  Phone,
  Upload,
} from "lucide-react";

const steps = [
  "Type",
  "Car Info",
  "Details",
  "Price",
  "Location",
  "Photos",
  "Contact",
  "Review",
];

export default function CreateListingPage() {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    type: "",
    make: "",
    model: "",
    year: "",
    mileage: "",
    condition: "",
    transmission: "",
    price: "",
    city: "",
    phone: "",
  });

  const update = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <a
            href="/"
            className="flex items-center gap-2 font-semibold text-[#0B5D3B]"
          >
            <ArrowLeft size={18} /> Back
          </a>
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
                <button
                  onClick={() => update("type", "sell")}
                  className={`rounded-2xl border p-5 text-left ${
                    form.type === "sell"
                      ? "border-[#0B5D3B] bg-[#0B5D3B]/10"
                      : "border-[#E5E7EB]"
                  }`}
                >
                  <Car className="text-[#0B5D3B]" />
                  <p className="mt-3 font-bold">Sell a Car</p>
                  <p className="text-sm text-gray-500">
                    List your vehicle for sale.
                  </p>
                </button>

                <button
                  onClick={() => update("type", "rent")}
                  className={`rounded-2xl border p-5 text-left ${
                    form.type === "rent"
                      ? "border-[#0B5D3B] bg-[#0B5D3B]/10"
                      : "border-[#E5E7EB]"
                  }`}
                >
                  <Car className="text-[#0B5D3B]" />
                  <p className="mt-3 font-bold">Rent a Car</p>
                  <p className="text-sm text-gray-500">
                    Offer your vehicle for daily rental.
                  </p>
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Car Information</h2>
              <input
                className="input"
                placeholder="Make e.g. Toyota"
                onChange={(e) => update("make", e.target.value)}
              />
              <input
                className="input"
                placeholder="Model e.g. Axio"
                onChange={(e) => update("model", e.target.value)}
              />
              <input
                className="input"
                placeholder="Year e.g. 2018"
                onChange={(e) => update("year", e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Vehicle Details</h2>
              <input
                className="input"
                placeholder="Mileage e.g. 78000 km"
                onChange={(e) => update("mileage", e.target.value)}
              />
              <select
                className="input"
                onChange={(e) => update("condition", e.target.value)}
              >
                <option value="">Condition</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
              <select
                className="input"
                onChange={(e) => update("transmission", e.target.value)}
              >
                <option value="">Transmission</option>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Price</h2>
              <input
                className="input"
                placeholder={
                  form.type === "rent"
                    ? "Price per day e.g. 35"
                    : "Selling price e.g. 8500"
                }
                onChange={(e) => update("price", e.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Location</h2>
              <div className="flex items-center gap-2 rounded-2xl bg-[#F8F9FA] p-4">
                <MapPin className="text-[#0B5D3B]" />
                <input
                  className="w-full bg-transparent outline-none"
                  placeholder="City e.g. Harare"
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold">Upload Photos</h2>
              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#E5E7EB] p-10 text-center">
                <Upload className="text-[#0B5D3B]" />
                <p className="mt-3 font-semibold">Click to upload photos</p>
                <p className="text-sm text-gray-500">
                  Front, back, interior, engine
                </p>
                <input type="file" multiple className="hidden" />
              </label>
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
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <CheckCircle className="text-[#0B5D3B]" size={40} />
              <h2 className="mt-4 text-2xl font-bold">Review Listing</h2>
              <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                <p>
                  <b>Type:</b> {form.type}
                </p>
                <p>
                  <b>Car:</b> {form.make} {form.model} {form.year}
                </p>
                <p>
                  <b>Price:</b> ${form.price}
                </p>
                <p>
                  <b>Location:</b> {form.city}
                </p>
                <p>
                  <b>Contact:</b> {form.phone}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          {step > 0 ? (
            <button
              onClick={back}
              className="rounded-full border border-[#E5E7EB] px-5 py-3 font-semibold"
            >
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
            <button className="rounded-full bg-[#C9A227] px-6 py-3 font-bold text-[#121212]">
              Submit Listing
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
