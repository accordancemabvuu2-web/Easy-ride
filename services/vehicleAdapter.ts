import type { ListingStatus, ListingType, Vehicle } from "@/Types/vehicle";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function idValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return "";
  const candidate = value as { toHexString?: unknown; id?: unknown };
  if (typeof candidate.toHexString === "function") return (candidate.toHexString as () => string)();
  if (typeof candidate.id === "string") return candidate.id;
  return "";
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function displayCountry(value: unknown): string {
  const country = stringValue(value);
  if (!country) return "";
  if (country.length !== 2) return country;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country.toUpperCase()) ?? country;
  } catch {
    return country;
  }
}

function asListingType(value: unknown): ListingType {
  if (value === "rent") return "rent";
  if (value === "sale_and_rent") return "both";
  return "buy";
}

function asListingStatus(moderation: unknown, availability: unknown): ListingStatus {
  if (availability === "sold") return "sold";
  if (availability === "rented") return "rented";
  if (availability === "archived") return "archived";
  if (moderation === "published") return "active";
  if (moderation === "pending_review") return "pending";
  if (moderation === "rejected") return "rejected";
  if (moderation === "suspended") return "suspended";
  return "draft";
}

function asCondition(value: unknown): Vehicle["condition"] {
  if (value === "new" || value === "New") return "New";
  if (value === "certified_pre_owned" || value === "Excellent") return "Excellent";
  if (value === "Fair") return "Fair";
  return "Good";
}

function asTransmission(value: unknown): Vehicle["transmission"] {
  return typeof value === "string" && value.toLowerCase() === "manual" ? "Manual" : "Automatic";
}

function asFuelType(value: unknown): Vehicle["fuelType"] {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === "diesel") return "Diesel";
  if (normalized === "hybrid") return "Hybrid";
  if (normalized === "electric" || normalized === "ev") return "Electric";
  return "Petrol";
}

function imageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") return { url: item, order: index };
      const image = asRecord(item);
      return {
        url: stringValue(image.imageUrl ?? image.image_url ?? image.url ?? image.thumbnailUrl),
        order: numberValue(image.displayOrder ?? image.display_order, index),
      };
    })
    .filter((image) => Boolean(image.url))
    .sort((left, right) => left.order - right.order)
    .map((image) => image.url);
}

function sellerName(seller: UnknownRecord, vehicle: UnknownRecord): string {
  const fullName = seller.fullName ?? seller.displayName ?? seller.name ?? vehicle.sellerName;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const parts = [seller.firstName, seller.lastName].filter((part): part is string => typeof part === "string" && Boolean(part.trim()));
  return parts.join(" ") || "Easy Ride seller";
}

/** Converts Mongo vehicle documents and their populated image/profile data to the UI model. */
export function adaptVehicle(value: unknown): Vehicle {
  const raw = asRecord(value);
  const seller = asRecord(raw.seller ?? raw.owner);
  const dealer = asRecord(raw.dealer);
  const location = asRecord(raw.location);
  const coordinates = Array.isArray(location.coordinates) ? location.coordinates : [];
  const rental = asRecord(raw.rentalPricing);
  const type = asListingType(raw.listingType);
  const salePrice = optionalNumber(raw.salePrice);
  const rentalPricing = {
    day: optionalNumber(rental.day),
    week: optionalNumber(rental.week),
    month: optionalNumber(rental.month),
  };
  const price = type === "rent" ? rentalPricing.day ?? salePrice ?? 0 : salePrice ?? rentalPricing.day ?? 0;
  const images = imageUrls(raw.images ?? raw.vehicleImages ?? raw.vehicle_images)
    .slice()
    .sort((left, right) => left.localeCompare(right));
  const explicitCover = stringValue(raw.coverImage ?? raw.coverImageUrl);
  const coverImage = explicitCover || images[0] || "";
  const sellerId = idValue(raw.sellerId ?? raw.ownerId ?? raw.owner_id ?? seller.id);
  const dealerId = idValue(raw.dealerId ?? dealer.id);
  const latitude = numberValue(location.latitude, numberValue(coordinates[1]));
  const longitude = numberValue(location.longitude, numberValue(coordinates[0]));
  const country = displayCountry(raw.country ?? location.country);
  const city = stringValue(raw.city ?? location.city);
  const features = Array.isArray(raw.features)
    ? raw.features.filter((feature): feature is string => typeof feature === "string")
    : [];

  return {
    id: idValue(raw._id ?? raw.id),
    ownerId: sellerId,
    ownerName: sellerName(seller, raw),
    ownerPhone: stringValue(seller.phone ?? seller.contactPhone ?? raw.ownerPhone),
    ownerEmail: stringValue(seller.email ?? raw.ownerEmail),
    ...(dealerId ? { dealerId } : {}),
    listingType: type,
    status: asListingStatus(raw.moderationStatus ?? raw.status, raw.availabilityStatus),
    make: stringValue(raw.make, "Unknown make"),
    model: stringValue(raw.model, "Unknown model"),
    year: numberValue(raw.year),
    price,
    ...(salePrice !== undefined ? { salePrice } : {}),
    ...(Object.values(rentalPricing).some((amount) => amount !== undefined) ? { rentalPricing } : {}),
    currency: stringValue(raw.currency, "USD").toUpperCase(),
    ...(type === "rent" ? { priceLabel: "day" } : {}),
    transmission: asTransmission(raw.transmission),
    fuelType: asFuelType(raw.fuelType),
    mileage: numberValue(raw.mileage),
    condition: asCondition(raw.condition),
    ...(typeof raw.bodyType === "string" ? { bodyType: raw.bodyType } : {}),
    ...(typeof (raw.exteriorColor ?? raw.color) === "string" ? { color: stringValue(raw.exteriorColor ?? raw.color) } : {}),
    ...(typeof raw.drivetrain === "string" ? { drivetrain: raw.drivetrain } : {}),
    ...(optionalNumber(raw.engineCapacity) !== undefined ? { engineCapacity: optionalNumber(raw.engineCapacity) } : {}),
    features,
    description: stringValue(raw.description),
    location: {
      address: stringValue(raw.address ?? location.address),
      city,
      country,
      latitude,
      longitude,
    },
    images,
    coverImage,
    sellerType: dealerId ? "Dealer" : "Private Seller",
    verified: dealer.verificationStatus === "verified" || raw.verified === true,
    featured: raw.featured === true,
    views: numberValue(raw.viewCount ?? raw.views),
    favoritesCount: numberValue(raw.favoritesCount ?? raw.favorites_count),
    ...(typeof raw.rejectionReason === "string" ? { rejectionReason: raw.rejectionReason } : {}),
    ...(typeof raw.soldToUserId === "string" ? { soldToUserId: raw.soldToUserId } : {}),
    ...(typeof raw.completedOfferId === "string" ? { completedOfferId: raw.completedOfferId } : {}),
    ...(raw.createdAt || raw.created_at ? { createdAt: String(raw.createdAt ?? raw.created_at) } : {}),
    ...(raw.updatedAt || raw.updated_at ? { updatedAt: String(raw.updatedAt ?? raw.updated_at) } : {}),
  };
}
