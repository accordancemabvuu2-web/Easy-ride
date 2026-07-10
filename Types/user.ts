export type UserRole = "buyer" | "seller" | "dealer" | "admin";

export interface EasyRideUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: string;
}
