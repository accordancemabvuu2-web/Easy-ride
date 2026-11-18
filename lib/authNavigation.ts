import type { EasyRideUser } from "@/Types/user";

export function isAdminAccount(user: Partial<EasyRideUser> | null | undefined): boolean {
  return Boolean(
    user &&
      (user.role === "admin" ||
        user.role === "super_admin" ||
        user.adminRole),
  );
}

export function isSuperAdminAccount(user: Partial<EasyRideUser> | null | undefined): boolean {
  return Boolean(user && (user.role === "super_admin" || user.adminRole === "super_admin"));
}

/**
 * Checks if a user has an approved and verified dealership profile.
 * The account type and backend approval state both gate dealer privileges.
 */
export function isApprovedDealer(user: Partial<EasyRideUser> | null | undefined): boolean {
  if (!user || user.accountType !== "dealer") return false;
  const status = user.dealerVerificationStatus ?? user.dealership?.verificationStatus;
  if (status) return status === "verified";
  return user.role === "dealer";
}

/**
 * Checks if a user has registered as a dealer but has not yet been approved.
 */
export function isPendingDealerAccount(user: Partial<EasyRideUser> | null | undefined): boolean {
  if (!user || user.accountType !== "dealer" || isApprovedDealer(user)) return false;
  const status = user.dealerVerificationStatus ?? user.dealership?.verificationStatus;
  if (status === "rejected" || status === "suspended") return false;
  return status === "pending" || status === "under_review" || user.role === "user";
}

export function isBuyerAccount(user: Partial<EasyRideUser> | null | undefined): boolean {
  return Boolean(user && !isAdminAccount(user) && user.accountType === "buyer");
}

export function hasSellerAccess(user: Partial<EasyRideUser> | null | undefined): boolean {
  if (!user || isAdminAccount(user) || isPendingDealerAccount(user)) return false;
  return Boolean(
    user.accountType === "seller" ||
      user.capabilities?.includes("sell") ||
      isApprovedDealer(user),
  );
}

/** Apply the same account and capability checks used by dashboard route guards. */
export function hasDashboardAccess(
  user: Partial<EasyRideUser>,
  allowedRoles: readonly EasyRideUser["role"][],
): boolean {
  if (isAdminAccount(user)) {
    return allowedRoles.includes("admin") ||
      (isSuperAdminAccount(user) && allowedRoles.includes("super_admin"));
  }

  return allowedRoles.some((allowedRole) => {
    switch (allowedRole) {
      case "buyer":
        return isBuyerAccount(user);
      case "seller":
        return hasSellerAccess(user);
      case "dealer":
        return isApprovedDealer(user);
      case "admin":
      case "super_admin":
        return false;
      case "user":
        return user.role === "user";
      default:
        return user.role === allowedRole;
    }
  });
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
 * - Buyer: /dashboard/buyer
 * - Missing account type: / (safe fallback; never assume buyer)
 */
export function getDashboardDestination(user: EasyRideUser): string {
  if (isAdminAccount(user)) return "/admin";

  switch (user.accountType) {
    case "buyer":
      return "/dashboard/buyer";
    case "seller":
      return "/dashboard/seller";
    case "dealer":
      if (isApprovedDealer(user)) return "/dashboard/dealer";
      if (isPendingDealerAccount(user)) return "/dashboard/dealer/pending";
      return "/dealer/profile";
    default:
      return "/";
  }
}

/** Keep a caller-supplied next URL inside the authenticated user's dashboard permissions. */
export function getAuthenticatedRedirectDestination(
  nextParam: string | null | undefined,
  user: EasyRideUser,
): string {
  const defaultDestination = getDashboardDestination(user);
  if (!user.accountType && !isAdminAccount(user)) return "/";
  const destination = resolveRedirectDestination(nextParam, defaultDestination);
  const pathname = destination.split("?")[0].replace(/\/+$/, "") || "/";

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return isAdminAccount(user) ? destination : defaultDestination;
  }
  if (pathname === "/dashboard/dealer/pending") {
    return isPendingDealerAccount(user) ? destination : defaultDestination;
  }
  if (
    pathname === "/dashboard/dealer" ||
    pathname.startsWith("/dashboard/dealer/") ||
    pathname === "/dealer/dashboard" ||
    pathname === "/dealer/inventory" ||
    pathname === "/dealer/analytics"
  ) {
    return isApprovedDealer(user) ? destination : defaultDestination;
  }
  if (pathname === "/dashboard/buyer" || pathname.startsWith("/dashboard/buyer/")) {
    return isBuyerAccount(user) ? destination : defaultDestination;
  }
  if (pathname === "/dashboard/seller" || pathname.startsWith("/dashboard/seller/")) {
    return hasSellerAccess(user) ? destination : defaultDestination;
  }

  return destination;
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
