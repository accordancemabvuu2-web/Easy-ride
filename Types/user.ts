export type UserRole = "user" | "buyer" | "seller" | "dealer" | "admin" | "super_admin";
export type UserCapability = "buy" | "rent" | "sell" | "dealer";
export type AdminSubRole = "super_admin" | "operations" | "verification" | "support";
export type AccountStatus = "pending" | "active" | "suspended" | "deleted";
export type DealerVerificationStatus = "pending" | "under_review" | "verified" | "rejected" | "suspended";

export type AdminUserAccountFilter = "buyer" | "seller" | "dealer" | "admin" | "super_admin";
export type AdminUserRoleFilter = "user" | "dealer" | "admin";
export type AdminUserStatusFilter = "all" | AccountStatus;

/** Privacy-filtered row returned by GET /admin/users. */
export interface AdminUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  role: AdminUserRoleFilter;
  accountType: "buyer" | "seller" | "dealer" | null;
  adminRole: AdminSubRole | null;
  accountStatus: AccountStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  dealerVerificationStatus: DealerVerificationStatus | null;
}

export interface AdminUsersPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUsersResponse {
  success: true;
  data: AdminUserRecord[];
  meta: AdminUsersPagination;
}

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminUserStatusFilter;
  accountType?: AdminUserAccountFilter;
  role?: AdminUserRoleFilter;
}

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
  /** The exact role value received from the backend, retained for diagnostics/auditing. */
  backendRole?: string;
  accountType?: "buyer" | "seller" | "dealer";
  dealerVerificationStatus?: DealerVerificationStatus | null;
  roles?: UserRole[];
  capabilities: string[];
  permissions?: string[];
  adminRole?: AdminSubRole | null;
  accountStatus?: AccountStatus;
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
