"use client";

import { ApiError, api, setAccessToken, setAuthFailureHandler } from "@/lib/apiClient";
import {
  hasSellerAccess,
  isAdminAccount,
  isBuyerAccount,
  isApprovedDealer,
  isPendingDealerAccount,
  isSuperAdminAccount,
} from "@/lib/authNavigation";
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
  useRef,
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
  permissions?: string[];
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
  dealership?: DealershipSummary | null;
  memberships?: DealershipMembership[];
  profile?: EasyRideUser;
  accessToken?: string;
  refreshToken?: string;
  sessionCreated?: boolean;
}

export interface AuthContextValue {
  user: EasyRideUser | null;
  profile: EasyRideUser | null;
  loading: boolean;
  authUnavailable: boolean;
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
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    twoFactorCode?: string
  ) => Promise<EasyRideUser>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<EasyRideUser | null>;
  refreshUser: () => Promise<EasyRideUser | null>;
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

export function mapBackendUserToProfile(
  backendUser: BackendUserPayload,
  extra?: BackendAuthMeExtra
): EasyRideUser {
  const firstName = backendUser.firstName || "";
  const lastName = backendUser.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || backendUser.email;
  const capabilities = Array.isArray(backendUser.capabilities)
    ? backendUser.capabilities
    : [];
  const permissions = Array.isArray(backendUser.permissions)
    ? backendUser.permissions
    : [];

  const knownRoles: UserRole[] = ["user", "buyer", "seller", "dealer", "admin", "super_admin"];
  const backendRole = typeof backendUser.role === "string" ? backendUser.role : undefined;
  const role = backendRole && knownRoles.includes(backendRole as UserRole)
    ? backendRole as UserRole
    : "user";
  if (!backendRole) {
    console.error("[AuthDiagnostic] Backend user is missing required field: role");
  } else if (role === "user" && backendRole !== "user") {
    console.error("[AuthDiagnostic] Backend user has an unrecognized role value");
  }

  const accountType =
    backendUser.accountType === "buyer" ||
    backendUser.accountType === "seller" ||
    backendUser.accountType === "dealer"
      ? backendUser.accountType
      : undefined;
  const isAdministrativeAccount =
    role === "admin" || role === "super_admin" || Boolean(backendUser.adminRole);
  if (!accountType && !isAdministrativeAccount) {
    console.error("[AuthDiagnostic] Backend user is missing required field: accountType");
  }

  const dealerVerificationStatus =
    backendUser.dealerVerificationStatus ??
    extra?.dealership?.verificationStatus ??
    null;

  return {
    id: backendUser.id || backendUser._id || "",
    name: fullName,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email,
    phone: backendUser.phoneNumber || "",
    phoneNumber: backendUser.phoneNumber || "",
    role,
    backendRole,
    accountType,
    dealerVerificationStatus,
    roles: [role],
    capabilities,
    permissions,
    adminRole: backendUser.adminRole || null,
    accountStatus: backendUser.accountStatus,
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
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const authRevisionRef = useRef(0);
  const refreshUserPromiseRef = useRef<Promise<EasyRideUser | null> | null>(null);
  const authTransitionRef = useRef(false);

  // Restore authenticated session on initial mount or profile refresh
  const refreshUser = useCallback((): Promise<EasyRideUser | null> => {
    if (refreshUserPromiseRef.current) return refreshUserPromiseRef.current;
    const revision = authRevisionRef.current;
    const request = (async () => {
      try {
        const res = await api.get<{
          user: BackendUserPayload;
          dealership?: DealershipSummary | null;
          memberships?: DealershipMembership[];
        }>("/auth/me");

        if (res.success && res.data?.user) {
          const mapped = mapBackendUserToProfile(res.data.user, res.data);
          if (revision === authRevisionRef.current) {
            setUser(mapped);
            setAuthUnavailable(false);
          }
          if (process.env.NODE_ENV === "development") {
            console.info("[AuthDiagnostic] Profile refresh successful", {
              role: mapped.role,
              accountType: mapped.accountType,
              dealerStatus: mapped.dealerVerificationStatus,
            });
          }
          return mapped;
        }

        if (revision === authRevisionRef.current) {
          setUser(null);
          setAuthUnavailable(false);
        }
        return null;
      } catch (error) {
        if (revision === authRevisionRef.current) {
          const temporaryFailure = error instanceof ApiError &&
            (error.code === "AUTH_TEMPORARILY_UNAVAILABLE" || error.statusCode === 0 || error.statusCode === 429 || error.statusCode >= 500);
          setAuthUnavailable(temporaryFailure);
          if (!temporaryFailure) setUser(null);
          if (process.env.NODE_ENV === "development") {
            console.info("[AuthDiagnostic] Profile refresh failed", {
              failureType: temporaryFailure ? "temporary" : "unauthenticated",
              ...(error instanceof ApiError ? { status: error.statusCode, code: error.code } : {}),
            });
          }
        }
        return null;
      } finally {
        if (revision === authRevisionRef.current) {
          setLoading(false);
          refreshUserPromiseRef.current = null;
        }
      }
    })();

    refreshUserPromiseRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    setAuthFailureHandler(() => {
      if (authTransitionRef.current) return;
      authRevisionRef.current += 1;
      refreshUserPromiseRef.current = null;
      setUser(null);
      setAuthUnavailable(false);
      setLoading(false);
    });

    if (process.env.NODE_ENV === "development") {
      console.info("[AuthDiagnostic] Session restoration started", {
        endpoint: "/auth/me",
      });
    }

    void refreshUser();
    return () => setAuthFailureHandler(null);
  }, [refreshUser]);

  const register = useCallback(
    async (input: RegisterInput) => {
      authRevisionRef.current += 1;
      refreshUserPromiseRef.current = null;
      authTransitionRef.current = true;
      setAccessToken(null);
      setUser(null);
      setAuthUnavailable(false);
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

        const response = await api.post<Omit<RegisterResult, "profile">>("/auth/register", payload);
        const result = response.data ?? {};
        if (result.accessToken) setAccessToken(result.accessToken);

        let profile = result.user
          ? mapBackendUserToProfile(result.user, result)
          : null;
        if (profile) setUser(profile);
        if (profile) setAuthUnavailable(false);
        else if (result.accessToken || result.sessionCreated) profile = await refreshUser();

        return { ...result, profile: profile ?? undefined };
      } finally {
        authTransitionRef.current = false;
        setLoading(false);
      }
    },
    [refreshUser]
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe = false,
      twoFactorCode?: string
    ): Promise<EasyRideUser> => {
      authRevisionRef.current += 1;
      refreshUserPromiseRef.current = null;
      authTransitionRef.current = true;
      setAccessToken(null);
      setUser(null);
      setAuthUnavailable(false);
      setLoading(true);
      try {
        if (process.env.NODE_ENV === "development") {
          console.info("[AuthDiagnostic] Login flow entered");
        }

        const res = await api.post<{
          user: BackendUserPayload;
          accessToken?: string;
          dealership?: DealershipSummary | null;
          memberships?: DealershipMembership[];
        }>("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
          rememberMe,
          twoFactorCode,
        });

        if (!res.success || !res.data) {
          throw new Error("Authentication response was invalid.");
        }

        const tokenReceived = Boolean(res.data.accessToken);
        if (process.env.NODE_ENV === "development") {
          console.info("[AuthDiagnostic] Login API success", {
            accessTokenExists: tokenReceived,
            userExists: Boolean(res.data.user),
            rawRole: res.data.user?.role,
            accountType: res.data.user?.accountType,
          });
        }

        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
        }

        // Establish the initial profile directly from the login payload
        const initialProfile = res.data.user
          ? mapBackendUserToProfile(res.data.user, res.data)
          : null;

        if (initialProfile) {
          setUser(initialProfile);
        }

        // Await profile enrichment via /auth/me to load dealership/memberships details
        let finalProfile = initialProfile;
        try {
          if (process.env.NODE_ENV === "development") {
            console.info("[AuthDiagnostic] Login profile retrieval started", {
              endpoint: "/auth/me",
            });
          }

          const meRes = await api.get<{
            user: BackendUserPayload;
            dealership?: DealershipSummary | null;
            memberships?: DealershipMembership[];
          }>("/auth/me");

          if (meRes.success && meRes.data?.user) {
            finalProfile = mapBackendUserToProfile(meRes.data.user, meRes.data);
            setUser(finalProfile);
            if (process.env.NODE_ENV === "development") {
              console.info("[AuthDiagnostic] Login profile retrieval succeeded", {
                profileRetrievalSucceeded: true,
                resolvedRole: finalProfile.role,
                resolvedAccountType: finalProfile.accountType,
                dealerStatus: finalProfile.dealerVerificationStatus,
              });
            }
          } else if (process.env.NODE_ENV === "development") {
            console.info("[AuthDiagnostic] Login profile retrieval completed", {
              profileRetrievalSucceeded: false,
              userExists: false,
            });
          }
        } catch (meError) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[AuthDiagnostic] Login profile retrieval failed; retaining initial login profile", {
              profileRetrievalSucceeded: false,
              ...(meError instanceof ApiError
                ? { status: meError.statusCode, code: meError.code }
                : { errorType: meError instanceof Error ? meError.name : "UnknownError" }),
            });
          }
          // Do NOT clear user or fail login if login was successful
        }

        if (!finalProfile) {
          throw new Error("Unable to establish authenticated user profile.");
        }

        // A failed /auth/me refresh can trigger the global auth-failure handler;
        // keep the profile returned by a successful login in that case.
        setUser(finalProfile);
        setAuthUnavailable(false);
        return finalProfile;
      } finally {
        authTransitionRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    authRevisionRef.current += 1;
    refreshUserPromiseRef.current = null;
    authTransitionRef.current = true;
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on logout
    } finally {
      authTransitionRef.current = false;
      setAccessToken(null);
      setUser(null);
      setAuthUnavailable(false);
      setLoading(false);
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
  const isSuperAdmin = isSuperAdminAccount(user);
  const isAdmin = isAdminAccount(user);
  const isDealer = Boolean(!isAdmin && isApprovedDealer(user));
  const isPendingDealer = Boolean(!isAdmin && isPendingDealerAccount(user));
  const isSeller = hasSellerAccess(user);
  const isBuyer = Boolean(user && isBuyerAccount(user));

  const firebaseUserShim = useMemo<FirebaseUserShim | null>(() => {
    if (!user) return null;
    return {
      uid: user.id,
      email: user.email,
      displayName: user.name,
      getIdTokenResult: async () => ({
        claims: { admin: isAdminAccount(user) },
      }),
    };
  }, [user]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: user,
      loading,
      authUnavailable,
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
      authUnavailable,
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
