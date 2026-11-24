import { describe, expect, it } from "vitest";
import { adaptVehicle } from "@/services/vehicleAdapter";
import { toVehicleWritePayload } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";

describe("vehicle API adapter", () => {
  it("maps backend identifiers, status, prices, coordinates, images, and timestamps", () => {
    const vehicle = adaptVehicle({
      _id: "vehicle-1",
      sellerId: "seller-1",
      dealerId: "dealer-1",
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      condition: "used",
      listingType: "sale_and_rent",
      salePrice: 12000,
      rentalPricing: { day: 45, week: 250 },
      currency: "USD",
      moderationStatus: "published",
      availabilityStatus: "available",
      mileage: 45000,
      country: "ZW",
      city: "Harare",
      location: { type: "Point", coordinates: [31.05, -17.82] },
      images: [
        { id: "second", imageUrl: "https://media.example/second.jpg", displayOrder: 1, moderationStatus: "approved" },
        { id: "first", imageUrl: "https://media.example/first.jpg", displayOrder: 0, moderationStatus: "approved" },
      ],
      seller: { id: "seller-1", firstName: "Avery", lastName: "Morgan", phone: "+263771234567" },
      dealer: { id: "dealer-1", businessName: "Harare Motors", verificationStatus: "verified", contactPhone: "+263772345678" },
      viewCount: 17,
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-03T03:04:05.000Z",
    });

    expect(vehicle).toMatchObject({
      id: "vehicle-1",
      ownerId: "seller-1",
      ownerName: "Harare Motors",
      ownerPhone: "+263772345678",
      dealerId: "dealer-1",
      listingType: "both",
      status: "active",
      price: 12000,
      salePrice: 12000,
      rentalPricing: { day: 45, week: 250 },
      views: 17,
      images: ["https://media.example/first.jpg", "https://media.example/second.jpg"],
      coverImage: "https://media.example/first.jpg",
      location: { city: "Harare", latitude: -17.82, longitude: 31.05 },
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-03T03:04:05.000Z",
    });
  });

  it("safely defaults absent optional API values and maps availability over moderation state", () => {
    expect(adaptVehicle({ _id: "vehicle-2", moderationStatus: "published", availabilityStatus: "sold" })).toMatchObject({
      id: "vehicle-2",
      status: "sold",
      images: [],
      coverImage: "",
      location: { city: "", country: "", latitude: 0, longitude: 0 },
      views: 0,
    });
  });
});

describe("strict backend write payload adapter", () => {
  it("sends only backend-supported fields and maps rental price and GeoJSON coordinates", () => {
    const payload = toVehicleWritePayload({
      ownerId: "must-not-be-sent",
      ownerName: "Must Not Be Sent",
      ownerPhone: "must-not-be-sent",
      ownerEmail: "must-not-be-sent",
      listingType: "rent",
      make: " Toyota ",
      model: " Corolla ",
      year: 2022,
      price: 45,
      currency: "usd",
      condition: "Good",
      description: " Rental vehicle ",
      transmission: "Automatic",
      fuelType: "Petrol",
      mileage: 1000,
      location: { address: "Street 1", city: "Harare", country: "Zimbabwe", latitude: -17.82, longitude: 31.05 },
      images: ["https://frontend.example/photo.jpg"],
      coverImage: "https://frontend.example/photo.jpg",
      sellerType: "Private Seller",
      verified: false,
      featured: false,
    } as Partial<Vehicle>);

    expect(payload).toEqual({
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      condition: "used",
      description: "Rental vehicle",
      currency: "USD",
      mileage: 1000,
      transmission: "automatic",
      fuelType: "petrol",
      listingType: "rent",
      rentalPricing: { day: 45 },
      city: "Harare",
      country: "ZW",
      address: "Street 1",
      location: { type: "Point", coordinates: [31.05, -17.82] },
    });
    expect(Object.keys(payload)).not.toContain("ownerId");
    expect(Object.keys(payload)).not.toContain("images");
  });
});
