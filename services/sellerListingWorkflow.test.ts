import { beforeEach, describe, expect, it, vi } from "vitest";

const listingMocks = vi.hoisted(() => ({
  getListingById: vi.fn(),
  getMyDrafts: vi.fn(),
  removeVehicleImage: vi.fn(),
  reorderVehicleImages: vi.fn(),
  saveListingDraft: vi.fn(),
  submitListingDraft: vi.fn(),
  uploadVehicleImages: vi.fn(),
}));

vi.mock("@/services/listingService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/listingService")>()),
  ...listingMocks,
}));

import {
  saveSellerListingDraft,
  submitSellerListingDraft,
  retrySellerListingImageUpload,
  toSellerDraftPayload,
  toSellerListingInput,
  uploadSellerDraftPhotos,
  validateSellerListingForm,
  type SellerListingFormValues,
} from "@/services/sellerListingWorkflow";
import type { EasyRideUser } from "@/Types/user";

const profile = {
  id: "seller-1",
  name: "A Seller",
  email: "seller@example.test",
  role: "seller",
  capabilities: ["sell"],
  emailVerified: true,
} as EasyRideUser;

const form: SellerListingFormValues = {
  listingType: "both",
  make: " Toyota ",
  model: " Corolla ",
  trim: " LE ",
  year: "2020",
  condition: "Good",
  mileage: "45000",
  mileageUnit: "km",
  transmission: "Automatic",
  fuelType: "Petrol",
  bodyType: "Sedan",
  color: "White",
  interiorColor: "Black",
  drivetrain: "FWD",
  engineCapacity: "1.8",
  negotiable: true,
  price: "12000",
  dailyRentalPrice: "45",
  currency: "usd",
  city: "Harare",
  country: "Zimbabwe",
  address: "Main Road",
  latitude: "",
  longitude: "",
  description: "Well maintained.",
  features: "Air conditioning, Bluetooth",
};

describe("seller listing dashboard workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps supported fields and leaves missing coordinates out of the geo payload", () => {
    const input = toSellerListingInput(form, profile, false);

    expect(input).toMatchObject({
      listingType: "both",
      make: "Toyota",
      model: "Corolla",
      trim: "LE",
      mileageUnit: "km",
      interiorColor: "Black",
      drivetrain: "FWD",
      engineCapacity: 1.8,
      negotiable: true,
      salePrice: 12000,
      rentalPricing: { day: 45 },
      currency: "USD",
      features: ["Air conditioning", "Bluetooth"],
    });
    expect(Number.isNaN(input.location?.latitude)).toBe(true);
    expect(Number.isNaN(input.location?.longitude)).toBe(true);
  });

  it("creates an incomplete owner draft using only the backend-supported fields", async () => {
    listingMocks.saveListingDraft.mockResolvedValue("draft-1");

    await expect(saveSellerListingDraft({ ...form, make: "", model: "" })).resolves.toBe("draft-1");

    expect(listingMocks.saveListingDraft).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: "sale_and_rent", trim: "LE", interiorColor: "Black", negotiable: true }),
      undefined,
    );
    const payload = listingMocks.saveListingDraft.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("make");
    expect(payload).not.toHaveProperty("model");
    expect(payload).not.toHaveProperty("ownerId");
    expect(payload).not.toHaveProperty("ownerPhone");
  });

  it("updates only an existing owner draft and submits it through the review lifecycle", async () => {
    listingMocks.getListingById.mockResolvedValue({ id: "draft-2", status: "draft" });
    listingMocks.saveListingDraft.mockResolvedValue("draft-2");
    listingMocks.submitListingDraft.mockResolvedValue(undefined);

    await expect(saveSellerListingDraft(form, "draft-2")).resolves.toBe("draft-2");
    await expect(submitSellerListingDraft("draft-2")).resolves.toBeUndefined();

    expect(listingMocks.saveListingDraft).toHaveBeenCalledWith(expect.any(Object), "draft-2");
    expect(listingMocks.submitListingDraft).toHaveBeenCalledWith("draft-2");
  });

  it("refuses to edit a listing after it is no longer a draft", async () => {
    listingMocks.getListingById.mockResolvedValue({ id: "submitted-1", status: "pending" });

    await expect(saveSellerListingDraft(form, "submitted-1")).rejects.toThrow("Only a draft in your inventory can be updated.");
    expect(listingMocks.saveListingDraft).not.toHaveBeenCalled();
  });

  it("preserves the draft ID when photo upload fails and supports a retry", async () => {
    listingMocks.getListingById.mockResolvedValue({ id: "vehicle-2", status: "draft", imageRecords: [] });
    const storageError = Object.assign(new Error("Vehicle image storage is not configured."), {
      code: "IMAGE_STORAGE_UNAVAILABLE",
      statusCode: 503,
    });
    listingMocks.uploadVehicleImages.mockRejectedValue(storageError);
    const photo = new File(["jpeg"], "front.jpg", { type: "image/jpeg" });

    await expect(uploadSellerDraftPhotos("vehicle-2", [photo])).rejects.toMatchObject({
      name: "SellerListingImageUploadError",
      listingId: "vehicle-2",
      uploadError: storageError,
    });
    listingMocks.uploadVehicleImages.mockResolvedValue([]);
    await expect(retrySellerListingImageUpload("vehicle-2", [photo])).resolves.toEqual([]);
    expect(listingMocks.saveListingDraft).not.toHaveBeenCalled();
  });

  it("treats an ambiguous successful upload as complete when reloaded metadata includes the images", async () => {
    const uploaded = [{ id: "image-2", imageUrl: "https://media.example/2.jpg", displayOrder: 1 }];
    listingMocks.getListingById.mockResolvedValue({ id: "vehicle-3", status: "draft", imageRecords: [
      { id: "image-1", imageUrl: "https://media.example/1.jpg", displayOrder: 0 },
      ...uploaded,
    ] });
    const photo = new File(["jpeg"], "rear.jpg", { type: "image/jpeg" });

    await expect(uploadSellerDraftPhotos("vehicle-3", [photo], 1)).resolves.toEqual(uploaded);
    expect(listingMocks.uploadVehicleImages).not.toHaveBeenCalled();
  });

  it("validates required fields only when submitting a complete listing", () => {
    expect(validateSellerListingForm({ ...form, make: "", price: "" })).toContain("Enter the vehicle make.");
    expect(validateSellerListingForm(form)).toEqual([]);
    expect(toSellerDraftPayload({ ...form, make: "", model: "" })).not.toHaveProperty("make");
  });
});
