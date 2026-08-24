export type DealerStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export interface Dealer {
  id: string;
  ownerId: string;

  businessName: string;
  description: string;
  registrationNumber: string;

  email: string;
  phone: string;
  whatsapp: string;
  website?: string;

  logoUrl?: string;
  coverImageUrl?: string;

  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;

  status: DealerStatus;
  verified: boolean;

  averageRating: number;
  reviewCount: number;
  activeListings: number;

  createdAt?: unknown;
  updatedAt?: unknown;
}
