export type ListingType = "buy" | "rent" | "both";

export type ListingStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "sold"
  | "rented"
  | "archived"
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
  dealerId?: string;

  listingType: ListingType;
  status: ListingStatus;

  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  priceLabel?: string;
  salePrice?: number;
  rentalPricing?: { day?: number; week?: number; month?: number };

  transmission: "Automatic" | "Manual";
  fuelType: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  mileage: number;
  condition: "New" | "Excellent" | "Good" | "Fair";

  bodyType?: string;
  color?: string;
  drivetrain?: string;
  engineCapacity?: number;
  features?: string[];
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
  soldToUserId?: string;
  completedOfferId?: string;

  createdAt?: string;
  updatedAt?: string;
}
