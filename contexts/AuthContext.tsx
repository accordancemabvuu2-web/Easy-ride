"use client";

import { api, setAccessToken, setAuthFailureHandler } from "@/lib/apiClient";
import type {
  AdminSubRole,
  DealershipMembership,
  DealershipSummary,
  EasyRideUser,
  UserRole,
} from "@/Types/user";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface FirebaseUserShim {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdTokenResult?: () => Promise<{ claims: Record<string, unknown> }>;
}

export interface BackendUserPayload {
  id?: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  accountType?: "buyer" | "seller" | "dealer";
  capabilities?: string[];
  adminRole?: AdminSubRole | null;
  accountStatus?: "pending" | "active" | "suspended" | "deleted";
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  preferredCurrency?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
  createdAt?: string;
  dealerVerificationStatus?: "pending" | "under_review" | "verified" | "rejected" | "suspended" | null;
}

export interface BackendAuthMeExtra {
  dealership?: DealershipSummary | null;
  memberships?: DealershipMembership[];
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  accountType?: "buyer" | "seller" | "dealer";
  businessName?: string;
  businessRegistrationNumber?: string;
  dealerDescription?: string;
}

export interface RegisterResult {
  user?: BackendUserPayload;
  accessToken?: string;
  refreshToken?: string;
  sessionCreated?: boolean;
}

export interface AuthContextValue {
  user: EasyRideUser | null;
  profile: EasyRideUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isBuyer: boolean;
  isSeller: boolean;
  isDealer: boolean;
  isPendingDealer: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  firebaseUser: FirebaseUserShim | null;
  firebaseEnabled: boolean;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  login: (email: string, password: string, rememberMe?: boolean, twoFactorCode?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAccountRole: (role: "buyer" | "seller", phone?: string) => Promise<void>;
  activateSeller: () => Promise<void>;
  verifyEmail: (token: string, email?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapBackendUserToProfile(
  backendUser: BackendUserPayload,
  extra?: BackendAuthMeExtra
): EasyRideUser {
  const firstName = backendUser.firstName || "";
  const lastName = backendUser.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || backendUser.email;
  const capabilities = Array.isArray(backendUser.capabilities)
    ? backendUser.capabilities
    : ["buy"];

  let mappedRole: UserRole = "buyer";
  if (backendUser.role === "super_admin" || backendUser.adminRole === "super_admin") {
    mappedRole = "super_admin";
  } else if (backendUser.role === "admin" || backendUser.adminRole) {
    mappedRole = "admin";
  } else if (backendUser.role === "dealer") {
    mappedRole = "dealer";
  } else if (
    backendUser.accountType === "seller" ||
    capabilities.includes("sell") ||
    backendUser.role === "seller"
  ) {
    mappedRole = "seller";
  } else {
    mappedRole = "buyer";
  }

  return {
    id: backendUser.id || backendUser._id || "",
    name: fullName,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email,
    phone: backendUser.phoneNumber || "",
    phoneNumber: backendUser.phoneNumber || "",
    role: mappedRole,
    accountType: backendUser.accountType || "buyer",
    dealerVerificationStatus: backendUser.dealerVerificationStatus ?? extra?.dealership?.verificationStatus ?? null,
    roles: [mappedRole],
    capabilities,
    adminRole: backendUser.adminRole || null,
    accountStatus: backendUser.accountStatus || "active",
    emailVerified: Boolean(backendUser.emailVerified || backendUser.emailVerifiedAt),
    emailVerifiedAt: backendUser.emailVerifiedAt,
    preferredCurrency: backendUser.preferredCurrency || "USD",
    preferredLanguage: backendUser.preferredLanguage || "en",
    dealership: extra?.dealership || null,
    memberships: extra?.memberships || [],
    photoURL: backendUser.avatarUrl || "",
    avatarUrl: backendUser.avatarUrl || "",
    createdAt: backendUser.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EasyRideUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on initial mount
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{
        user: BackendUserPayload;
        dealership?: DealershipSummary | null;
        memberships?: DealershipMembership[];
      }>("/auth/me");
      if (res.success && res.data?.user) {
        const mapped = mapBackendUserToProfile(res.data.user, res.data);
        setUser(mapped);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setLoading(false);
    });
    void refreshUser();
    return () => setAuthFailureHandler(null);
  }, [refreshUser]);

  const register = useCallback(
    async (input: RegisterInput) => {
      setLoading(true);
      try {
        const parts = input.name.trim().split(/\s+/);
        const firstName = parts[0] || input.name.trim();
        const lastName = parts.slice(1).join(" ") || "";

        const payload: Record<string, unknown> = {
          firstName,
          lastName,
          email: input.email.trim().toLowerCase(),
          password: input.password,
        };
        if (input.phone && input.phone.trim()) {
          payload.phoneNumber = input.phone.trim();
        }

        if (input.accountType) {
          payload.accountType = input.accountType;
        }
        if (input.accountType === "dealer") {
          payload.businessName = input.businessName;
          payload.businessRegistrationNumber = input.businessRegistrationNumber;
          payload.dealerDescription = input.dealerDescription;
        }

        const response = await api.post<RegisterResult>("/auth/register", payload);
        if (response.data?.accessToken) {
          setAccessToken(response.data.accessToken);
        }
        return response.data ?? {};
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string, rememberMe = false, twoFactorCode?: string) => {
      setLoading(true);
      try {
        const res = await api.post<{ user: BackendUserPayload; accessToken?: string }>("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
          rememberMe,
          twoFactorCode,
        });

        if (res.success && res.data) {
          if (res.data.accessToken) {
            setAccessToken(res.data.accessToken);
          }
          // Load full account context
          await refreshUser();
        }
      } finally {
        setLoading(false);
      }
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const activateSeller = useCallback(async () => {
    const res = await api.post<{ user: BackendUserPayload; accessToken?: string }>("/auth/activate-seller");
    if (res.success && res.data?.user) {
      if (res.data.accessToken) {
        setAccessToken(res.data.accessToken);
      }
      await refreshUser();
    }
  }, [refreshUser]);

  const updateAccountRole = useCallback(
    async (role: "buyer" | "seller") => {
      if (role === "seller") {
        await activateSeller();
      }
    },
    [activateSeller]
  );

  const verifyEmail = useCallback(
    async (token: string, email?: string) => {
      await api.post("/auth/verify-email", { token, email });
      await refreshUser();
    },
    [refreshUser]
  );

  const resendVerification = useCallback(
    async (targetEmail?: string) => {
      const email = targetEmail || user?.email;
      if (!email) throw new Error("Email address is required to resend verification.");
      await api.post("/auth/resend-verification", { email });
    },
    [user?.email]
  );

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.post("/auth/reset-password", { token, newPassword });
  }, []);

  const checkEmailVerification = useCallback(async () => {
    await refreshUser();
    return Boolean(user?.emailVerified);
  }, [refreshUser, user?.emailVerified]);

  const loginWithGoogle = useCallback(async () => {
    throw new Error(
      "Google Sign-In requires an active OAuth client ID. Please sign in with your email and password."
    );
  }, []);

  const isAuthenticated = Boolean(user);
  const isSuperAdmin = user?.role === "super_admin" || user?.adminRole === "super_admin";
  const isAdmin = Boolean(
    user?.role === "admin" || isSuperAdmin || Boolean(user?.adminRole)
  );
  const isPendingDealer = Boolean(
    user?.accountType === "dealer" &&
      ["pending", "under_review"].includes(user.dealerVerificationStatus || "")
  );
  const isDealer = Boolean(
    !isPendingDealer &&
      user?.role === "dealer" &&
      (user.dealerVerificationStatus === "verified" ||
        user.dealership?.verificationStatus === "verified" ||
        user.memberships?.some((m) => m.role === "owner" || m.role === "manager"))
  );
  const isSeller = Boolean(
    user?.role === "seller" ||
    user?.capabilities?.includes("sell") ||
    isDealer ||
    isAdmin
  );
  const isBuyer = Boolean(user);

  const firebaseUserShim = useMemo<FirebaseUserShim | null>(() => {
    if (!user) return null;
    return {
      uid: user.id,
      email: user.email,
      displayName: user.name,
      getIdTokenResult: async () => ({
        claims: { admin: user.role === "admin" },
      }),
    };
  }, [user]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: user,
      loading,
      isAuthenticated,
      isBuyer,
      isSeller,
      isDealer,
      isPendingDealer,
      isAdmin,
      isSuperAdmin,
      firebaseUser: firebaseUserShim,
      firebaseEnabled: false,
      register,
      login,
      loginWithGoogle,
      logout,
      refreshProfile: refreshUser,
      refreshUser,
      updateAccountRole,
      activateSeller,
      verifyEmail,
      sendVerificationEmail: resendVerification,
      resendVerification,
      forgotPassword,
      resetPassword,
      checkEmailVerification,
    }),
    [
      user,
      loading,
      isAuthenticated,
      isBuyer,
      isSeller,
      isDealer,
      isPendingDealer,
      isAdmin,
      isSuperAdmin,
      firebaseUserShim,
      register,
      login,
      loginWithGoogle,
      logout,
      refreshUser,
      updateAccountRole,
      activateSeller,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      checkEmailVerification,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
