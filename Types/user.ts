export type UserRole = "user" | "buyer" | "seller" | "dealer" | "admin";
export type UserCapability = "buy" | "rent" | "sell" | "dealer";
export type AdminSubRole = "super_admin" | "operations" | "verification" | "support";

export interface DealershipMembership {
  id: string;
  dealerId: string;
  dealerName: string;
  role: "owner" | "manager" | "inventory_manager" | "sales";
  permissions: string[];
}

export interface DealershipSummary {
  id: string;
  businessName: string;
  verificationStatus: "pending" | "under_review" | "verified" | "rejected" | "suspended";
  contactEmail?: string;
  contactPhone?: string;
}

export interface EasyRideUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  role: UserRole;
  roles?: UserRole[];
  capabilities: string[];
  adminRole?: AdminSubRole | null;
  accountStatus?: "pending" | "active" | "suspended" | "deleted";
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  preferredCurrency?: string;
  preferredLanguage?: string;
  dealerProfileId?: string;
  dealership?: DealershipSummary | null;
  memberships?: DealershipMembership[];
  photoURL?: string;
  avatarUrl?: string;
  createdAt?: string;
}
