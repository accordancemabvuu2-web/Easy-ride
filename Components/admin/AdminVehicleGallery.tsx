"use client";

import type { Vehicle } from "@/Types/vehicle";
import { useState } from "react";

export function getAdminVehicleGalleryImages(vehicle: Pick<Vehicle, "coverImage" | "images">): string[] {
  const images = [...new Set(vehicle.images.filter((url) => {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }))];
  if (vehicle.coverImage) {
    try {
      if (new URL(vehicle.coverImage).protocol === "https:") {
        return [vehicle.coverImage, ...images.filter((url) => url !== vehicle.coverImage)];
      }
    } catch {
      // Ignore malformed or non-public cover URLs.
    }
  }
  return images;
}

export default function AdminVehicleGallery({ vehicle }: { vehicle: Pick<Vehicle, "coverImage" | "images" | "make" | "model"> }) {
  const images = getAdminVehicleGalleryImages(vehicle);
  const [activeImage, setActiveImage] = useState(images[0] ?? "");
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  return (
    <section aria-label="Vehicle image gallery" className="space-y-3">
      <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-[#f0f3f1] sm:min-h-[272px]">
        {activeImage && !failedImages.has(activeImage) ? (
          <a href={activeImage} target="_blank" rel="noopener noreferrer" aria-label="Open full-size vehicle image">
            <img
              src={activeImage}
              alt={`${vehicle.make} ${vehicle.model} listing photo`}
              loading="lazy"
              decoding="async"
              onError={() => setFailedImages((previous) => new Set(previous).add(activeImage))}
              className="max-h-[420px] w-full rounded-lg object-contain"
            />
          </a>
        ) : (
          <p role="status" className="px-5 text-center text-sm text-subtle">{images.length ? "This image is unavailable." : "No listing photos have been uploaded."}</p>
        )}
      </div>
      {images.length > 1 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="All listing photos">{images.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(image)} aria-label={`Show listing photo ${index + 1}${index === 0 ? ", cover image" : ""}`} aria-pressed={activeImage === image} className={`relative aspect-video overflow-hidden rounded-md border ${activeImage === image ? "border-brand ring-2 ring-brand/30" : "border-hairline"}`}>{failedImages.has(image) ? <span className="flex h-full items-center justify-center bg-[#f0f3f1] text-xs text-subtle">Unavailable</span> : <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailedImages((previous) => new Set(previous).add(image))} className="h-full w-full object-cover" />}<span className="sr-only">Photo {index + 1}{index === 0 ? ", cover image" : ""}</span></button>)}</div>}
      {images.length > 0 && <p className="text-xs text-subtle">{images.length} photo{images.length === 1 ? "" : "s"}; cover image shown first. Select a photo to preview it or open the large image to view full size.</p>}
    </section>
  );
}
