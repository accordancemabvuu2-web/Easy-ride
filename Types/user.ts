export type UserRole = "buyer" | "seller" | "dealer" | "admin";
export type UserCapability = "buy" | "rent" | "sell" | "dealer";

export interface EasyRideUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  roles?: UserRole[];
  capabilities?: UserCapability[];
  dealerProfileId?: string;
  photoURL?: string;
  createdAt?: string;
}
