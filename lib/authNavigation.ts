import type { EasyRideUser } from "@/Types/user";

/**
 * Checks if a user has an approved and verified dealership profile.
 * Authorization requires authoritative backend verification status or verified dealership membership.
 */
export function isApprovedDealer(user: Partial<EasyRideUser> | null | undefined): boolean {
  if (!user) return false;
  const isDealerAccount = user.role === "dealer" || user.accountType === "dealer";
  if (!isDealerAccount) return false;

  return Boolean(
    user.dealerVerificationStatus === "verified" ||
      user.dealership?.verificationStatus === "verified" ||
      user.memberships?.some((m) => m.role === "owner" || m.role === "manager")
  );
}

/**
 * Checks if a user has registered as a dealer but has not yet been approved.
 */
export function isPendingDealerAccount(user: Partial<EasyRideUser> | null | undefined): boolean {
  if (!user) return false;
  const isDealerAccount = user.role === "dealer" || user.accountType === "dealer";
  if (!isDealerAccount) return false;

  return !isApprovedDealer(user);
}

/**
 * Calculates the authoritative dashboard destination based on backend-verified role,
 * account type, and verification status.
 *
 * Expected destinations:
 * - Admin / Super Admin: /admin
 * - Approved Dealer: /dashboard/dealer
 * - Pending Dealer: /dashboard/dealer/pending
 * - Seller: /dashboard/seller
 * - Buyer (and default): /dashboard/buyer
 */
export function getDashboardDestination(user: EasyRideUser): string {
  // 1. Administrators
  const isSuperAdmin = user.role === "super_admin" || user.adminRole === "super_admin";
  const isAdmin = Boolean(user.role === "admin" || isSuperAdmin || Boolean(user.adminRole));
  if (isAdmin) {
    return "/admin";
  }

  // 2. Dealerships
  if (isApprovedDealer(user)) {
    return "/dashboard/dealer";
  }

  if (isPendingDealerAccount(user)) {
    return "/dashboard/dealer/pending";
  }

  // 3. Individual Sellers
  const isSeller = Boolean(
    user.role === "seller" ||
      user.accountType === "seller" ||
      user.capabilities?.includes("sell")
  );
  if (isSeller) {
    return "/dashboard/seller";
  }

  // 4. Default: Marketplace Buyers
  return "/dashboard/buyer";
}

/**
 * Validates any optional next query parameter and resolves the target redirect URL.
 * Prevents open redirects and circular navigation loops.
 */
export function resolveRedirectDestination(
  nextParam: string | null | undefined,
  defaultDestination: string
): string {
  if (!nextParam) {
    return defaultDestination;
  }

  const trimmed = nextParam.trim();

  // Enforce relative path, avoid protocol-relative URLs (e.g. //evil.com or /\evil.com)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return defaultDestination;
  }

  // Prevent navigation loops to login or generic dashboard
  const pathname = trimmed.split("?")[0].replace(/\/+$/, "") || "/";
  if (pathname === "/login" || pathname === "/dashboard" || pathname === "") {
    return defaultDestination;
  }

  return trimmed;
}
