import { ApiError, api } from "@/lib/apiClient";
import type { Dealer, DealerStatus } from "@/Types/dealer";

type RecordValue = Record<string, unknown>;

export interface DealerApplicationInput {
  businessName: string;
  businessRegistrationNumber?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

function asRecord(value: unknown): RecordValue {
  return typeof value === "object" && value !== null ? value as RecordValue : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapStatus(value: unknown): DealerStatus {
  if (value === "verified" || value === "rejected" || value === "suspended") return value;
  return "pending";
}

function mapDealer(value: unknown, ownerId = ""): Dealer | null {
  const record = asRecord(value);
  const id = record._id ?? record.id;
  const businessName = asString(record.businessName);
  if (typeof id !== "string" || !businessName) return null;

  const status = mapStatus(record.verificationStatus);
  const location = asRecord(record.location);

  return {
    id,
    ownerId: asString(record.userId) || ownerId,
    businessName,
    description: asString(record.description),
    registrationNumber: asString(record.businessRegistrationNumber),
    email: asString(record.contactEmail),
    phone: asString(record.contactPhone),
    whatsapp: asString(record.contactPhone),
    address: asString(record.address),
    city: asString(location.city),
    country: asString(location.country),
    latitude: typeof location.latitude === "number" ? location.latitude : 0,
    longitude: typeof location.longitude === "number" ? location.longitude : 0,
    status,
    verified: status === "verified",
    averageRating: typeof record.ratingAverage === "number" ? record.ratingAverage : 0,
    reviewCount: typeof record.ratingCount === "number" ? record.ratingCount : 0,
    activeListings: 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    logoUrl: asString(record.logoUrl) || undefined,
  };
}

function optionalField(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export async function getMyDealerProfile(): Promise<Dealer | null> {
  try {
    const response = await api.get<unknown>("/dealers/me");
    return mapDealer(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function submitDealerApplication(
  owner: { id: string; name: string; email: string; phone?: string },
  input: DealerApplicationInput,
): Promise<Dealer> {
  const businessName = input.businessName.trim();
  if (businessName.length < 2) {
    throw new Error("Enter a business name.");
  }

  const response = await api.post<unknown>("/dealers", {
    businessName,
    businessRegistrationNumber: optionalField(input.businessRegistrationNumber),
    description: optionalField(input.description),
    contactEmail: optionalField(input.contactEmail),
    contactPhone: optionalField(input.contactPhone),
    address: optionalField(input.address),
    authorizedRepresentative: {
      name: owner.name,
      email: owner.email,
      phone: owner.phone ?? "",
    },
  });

  const dealer = mapDealer(response.data, owner.id);
  if (!dealer) throw new Error("The dealer application response was invalid.");
  return dealer;
}
