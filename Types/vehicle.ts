export type ListingType = "buy" | "rent";

export type ListingStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "sold"
  | "rented"
  | "suspended";

export interface VehicleLocation {
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface Vehicle {
  id: string;

  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;

  listingType: ListingType;
  status: ListingStatus;

  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  priceLabel?: string;

  transmission: "Automatic" | "Manual";
  fuelType: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  mileage: number;
  condition: "New" | "Excellent" | "Good" | "Fair";

  bodyType?: string;
  color?: string;
  description: string;

  location: VehicleLocation;

  images: string[];
  coverImage: string;

  sellerType: "Private Seller" | "Dealer";
  verified: boolean;
  featured: boolean;

  views: number;
  favoritesCount: number;

  rejectionReason?: string;

  createdAt?: string;
  updatedAt?: string;
}
