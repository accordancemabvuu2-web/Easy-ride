import { describe, expect, it } from "vitest";
import { getAdminVehicleGalleryImages } from "@/Components/admin/AdminVehicleGallery";
import type { Vehicle } from "@/Types/vehicle";

describe("admin vehicle gallery image selection", () => {
  it("keeps backend display order and places a missing cover first", () => {
    expect(getAdminVehicleGalleryImages({
      coverImage: "https://media.example/cover.jpg",
      images: ["https://media.example/second.jpg", "https://media.example/cover.jpg"],
    } as Vehicle)).toEqual([
      "https://media.example/cover.jpg",
      "https://media.example/second.jpg",
    ]);
  });

  it("returns an empty gallery for missing images and excludes non-HTTPS URLs", () => {
    expect(getAdminVehicleGalleryImages({
      coverImage: "",
      images: ["javascript:alert(1)", "http://images.example/photo.jpg"],
    } as Vehicle)).toEqual([]);
  });
});
