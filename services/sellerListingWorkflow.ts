import type { EasyRideUser } from "@/Types/user";
import type { Vehicle, ListingType } from "@/Types/vehicle";
import {
  getListingById,
  getMyDrafts,
  removeVehicleImage,
  reorderVehicleImages,
  saveListingDraft,
  submitListingDraft,
  uploadVehicleImages,
  type VehicleListingInput,
} from "@/services/listingService";
import { toVehicleWritePayload } from "@/services/listingService";

export interface SellerListingFormValues {
  listingType: ListingType;
  make: string;
  model: string;
  year: string;
  trim: string;
  condition: Vehicle["condition"];
  mileage: string;
  mileageUnit: "km" | "mi";
  transmission: Vehicle["transmission"];
  fuelType: Vehicle["fuelType"];
  bodyType: string;
  color: string;
  interiorColor: string;
  drivetrain: string;
  engineCapacity: string;
  negotiable: boolean;
  price: string;
  dailyRentalPrice: string;
  currency: string;
  city: string;
  country: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  features: string;
}

function optionalCoordinate(value: string): number {
  return value.trim() ? Number(value) : Number.NaN;
}

export function toSellerListingInput(
  form: SellerListingFormValues,
  profile: EasyRideUser,
  isDealer: boolean,
): VehicleListingInput {
  const listingType = form.listingType;
  const price = Number(form.price);
  const dailyRentalPrice = Number(form.dailyRentalPrice);
  return {
    ownerId: profile.id,
    ownerName: profile.name,
    ownerPhone: profile.phoneNumber ?? profile.phone ?? "",
    ownerEmail: profile.email,
    dealerId: profile.dealerProfileId,
    listingType,
    make: form.make.trim(),
    model: form.model.trim(),
    trim: form.trim.trim() || undefined,
    year: Number(form.year),
    condition: form.condition,
    mileage: form.mileage.trim() ? Number(form.mileage) : 0,
    mileageUnit: form.mileageUnit,
    transmission: form.transmission,
    fuelType: form.fuelType,
    bodyType: form.bodyType.trim() || undefined,
    color: form.color.trim() || undefined,
    interiorColor: form.interiorColor.trim() || undefined,
    drivetrain: form.drivetrain.trim() || undefined,
    engineCapacity: form.engineCapacity.trim() ? Number(form.engineCapacity) : undefined,
    negotiable: form.negotiable,
    price: listingType === "rent" ? dailyRentalPrice : price,
    salePrice: listingType === "rent" ? undefined : price,
    rentalPricing:
      listingType === "rent" || listingType === "both"
        ? { day: dailyRentalPrice }
        : undefined,
    currency: form.currency.toUpperCase(),
    description: form.description.trim(),
    features: form.features
      .split(",")
      .map((feature) => feature.trim())
      .filter(Boolean),
    location: {
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      latitude: optionalCoordinate(form.latitude),
      longitude: optionalCoordinate(form.longitude),
    },
    images: [],
    coverImage: "",
    sellerType: isDealer ? "Dealer" : "Private Seller",
    verified: isDealer,
    featured: false,
  };
}

export function toSellerDraftPayload(form: SellerListingFormValues): Record<string, unknown> {
  const price = form.price.trim() ? Number(form.price) : undefined;
  const dailyRentalPrice = form.dailyRentalPrice.trim() ? Number(form.dailyRentalPrice) : undefined;
  const input: Partial<Vehicle> = {
    listingType: form.listingType,
    make: form.make.trim() || undefined,
    model: form.model.trim() || undefined,
    year: form.year.trim() ? Number(form.year) : undefined,
    condition: form.condition,
    description: form.description.trim() || undefined,
    currency: form.currency,
    mileage: form.mileage.trim() ? Number(form.mileage) : undefined,
    mileageUnit: form.mileageUnit,
    transmission: form.transmission,
    fuelType: form.fuelType,
    bodyType: form.bodyType.trim() || undefined,
    color: form.color.trim() || undefined,
    trim: form.trim.trim() || undefined,
    interiorColor: form.interiorColor.trim() || undefined,
    drivetrain: form.drivetrain.trim() || undefined,
    engineCapacity: form.engineCapacity.trim() ? Number(form.engineCapacity) : undefined,
    negotiable: form.negotiable,
    price: form.listingType === "rent" ? dailyRentalPrice : price,
    salePrice: form.listingType === "rent" ? undefined : price,
    rentalPricing: form.listingType === "rent" || form.listingType === "both"
      ? (dailyRentalPrice === undefined ? {} : { day: dailyRentalPrice })
      : undefined,
    features: form.features.split(",").map((feature) => feature.trim()).filter(Boolean),
    location: {
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      latitude: optionalCoordinate(form.latitude),
      longitude: optionalCoordinate(form.longitude),
    },
  };
  const payload = toVehicleWritePayload(input);
  for (const field of ["make", "model", "description", "city", "address"] as const) {
    if (typeof payload[field] === "string" && !(payload[field] as string).trim()) delete payload[field];
  }
  if (typeof payload.year === "number" && !Number.isInteger(payload.year)) delete payload.year;
  return payload;
}

export class SellerListingImageUploadError extends Error {
  constructor(
    readonly listingId: string,
    readonly uploadError: unknown,
  ) {
    super("The listing was created, but its photos could not be uploaded.");
    this.name = "SellerListingImageUploadError";
  }
}

export async function saveSellerListingDraft(form: SellerListingFormValues, draftId?: string) {
  if (draftId) {
    const current = await getListingById(draftId);
    if (!current || current.status !== "draft") {
      throw new Error("Only a draft in your inventory can be updated.");
    }
  }
  return saveListingDraft(toSellerDraftPayload(form), draftId);
}

export async function uploadSellerDraftPhotos(listingId: string, photos: File[], startingImageCount = 0) {
  if (!photos.length) return [];
  try {
    const before = await getListingById(listingId);
    const beforeRecords = before?.imageRecords ?? [];
    if (beforeRecords.length >= startingImageCount + photos.length) {
      return beforeRecords.slice(startingImageCount, startingImageCount + photos.length);
    }
    return await uploadVehicleImages(listingId, photos);
  } catch (error) {
    try {
      const after = await getListingById(listingId);
      const afterRecords = after?.imageRecords ?? [];
      if (afterRecords.length >= startingImageCount + photos.length) {
        return afterRecords.slice(startingImageCount, startingImageCount + photos.length);
      }
    } catch {
      // Preserve the upload error; the draft itself remains available for retry.
    }
    throw new SellerListingImageUploadError(listingId, error);
  }
}

export function validateSellerListingForm(form: SellerListingFormValues): string[] {
  const errors: string[] = [];
  if (!form.make.trim()) errors.push("Enter the vehicle make.");
  if (!form.model.trim()) errors.push("Enter the vehicle model.");
  if (!Number.isInteger(Number(form.year)) || Number(form.year) < 1886 || Number(form.year) > new Date().getFullYear() + 1) {
    errors.push("Enter a valid model year.");
  }
  if (!form.description.trim()) errors.push("Add a vehicle description.");
  if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) errors.push("Choose a valid three-letter currency.");
  if (form.listingType !== "rent" && (!form.price.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
    errors.push("Enter a valid sale price.");
  }
  if ((form.listingType === "rent" || form.listingType === "both") && (!form.dailyRentalPrice.trim() || !Number.isFinite(Number(form.dailyRentalPrice)) || Number(form.dailyRentalPrice) < 0)) {
    errors.push("Enter a valid daily rental price.");
  }
  if (Boolean(form.latitude.trim()) !== Boolean(form.longitude.trim())) errors.push("Enter both coordinates or leave both blank.");
  return errors;
}

export function submitSellerListingDraft(listingId: string) {
  return submitListingDraft(listingId);
}

export function retrySellerListingImageUpload(listingId: string, photos: File[]) {
  return uploadVehicleImages(listingId, photos);
}

export { getListingById, getMyDrafts, removeVehicleImage, reorderVehicleImages };
