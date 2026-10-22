"use client";

import { firebaseReady } from "@/lib/firebase";
import type { EasyRideUser, UserCapability, UserRole } from "@/Types/user";
import type { User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "buyer" | "seller";
}

interface AuthContextValue {
  firebaseUser: Pick<User, "uid"> | null;
  profile: EasyRideUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  continueWithLocalRole: (role: UserRole) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAccountRole: (role: "buyer" | "seller", phone?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}

const AUTH_CACHE_KEY = "easy-ride:auth-profile";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function capabilitiesForRole(role: UserRole): UserCapability[] {
  if (role === "admin" || role === "dealer") {
    return ["buy", "rent", "sell", "dealer"];
  }

  return role === "seller" ? ["buy", "rent", "sell"] : ["buy", "rent"];
}

function normalizeProfile(profile: EasyRideUser): EasyRideUser {
  return {
    ...profile,
    roles: profile.roles?.length ? profile.roles : [profile.role],
    capabilities: profile.capabilities?.length
      ? profile.capabilities
      : capabilitiesForRole(profile.role),
  };
}

function withAuthDeadline<T>(request: Promise<T>, fallback: T, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(fallback), timeoutMs);
    request.then(resolve, () => resolve(fallback)).finally(() => window.clearTimeout(timeout));
  });
}

function readCachedProfile(): EasyRideUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EasyRideUser;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: EasyRideUser | null) {
  if (typeof window === "undefined") return;

  if (!profile) {
    window.localStorage.removeItem(AUTH_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(profile));
}

type FirebaseSessionUser = Pick<User, "uid">;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseSessionUser | null>(null);
  // Keep the server render and the first browser render identical. Session storage
  // is browser-only, so hydrate its cached profile after React has mounted.
  const [profile, setProfile] = useState<EasyRideUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.profile) return;
        const data = result.profile;
        setProfile(normalizeProfile({ id: data.id, name: data.display_name || data.full_name || "Easy Ride User", email: data.email || "", phone: data.phone || "", role: data.role || "buyer", roles: [data.role || "buyer"], capabilities: capabilitiesForRole(data.role || "buyer"), photoURL: data.avatar_url || "", createdAt: data.created_at }));
        setFirebaseUser({ uid: data.id });
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const continueWithLocalRole = (_role: UserRole) => { throw new Error("Sign in with your Easy Ride account to continue."); };

  const register = async ({
    name,
    email,
    password,
    phone = "",
    role = "buyer",
  }: RegisterInput) => {
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, phone, role }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Registration failed.");
    await refreshProfile();
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to sign in.");
    await refreshProfile();
  };

  const loginWithGoogle = async () => {
    throw new Error("Google sign-in is not configured for MongoDB authentication yet. Use email and password.");
  };

  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
    writeCachedProfile(null);
    setProfile(null);
    window.location.replace("/");
  };

  const refreshProfile = async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to refresh profile.");
    const data = result.profile;
    if (!data) { setProfile(null); setFirebaseUser(null); return; }
    setProfile(normalizeProfile({ id: data.id, name: data.display_name || data.full_name || "Easy Ride User", email: data.email || "", phone: data.phone || "", role: data.role || "buyer", roles: [data.role || "buyer"], capabilities: capabilitiesForRole(data.role || "buyer"), photoURL: data.avatar_url || "", createdAt: data.created_at }));
    setFirebaseUser({ uid: data.id });
  };

  const updateAccountRole = useCallback(
    async (role: "buyer" | "seller", phone?: string) => {
      if (!profile) {
        throw new Error("Your account profile is not ready yet.");
      }

      const updatedProfile: EasyRideUser = normalizeProfile({
        ...profile,
        ...(phone === undefined ? {} : { phone }),
        role,
        roles: [role],
        capabilities: capabilitiesForRole(role),
      });

      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: updatedProfile.name, phone: updatedProfile.phone, role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update your profile.");
      await refreshProfile();
    },
    [profile],
  );

  const sendVerificationEmail = async () => {
    throw new Error("Email verification delivery is not configured yet.");
  };

  const checkEmailVerification = async () => {
    return Boolean(profile);
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      firebaseEnabled: Boolean(profile),
      register,
      login,
      continueWithLocalRole,
      loginWithGoogle,
      logout,
      refreshProfile,
      updateAccountRole,
      sendVerificationEmail,
      checkEmailVerification,
    }),
    [
      firebaseUser,
      profile,
      loading,
      register,
      login,
      continueWithLocalRole,
      loginWithGoogle,
      logout,
      refreshProfile,
      updateAccountRole,
      sendVerificationEmail,
      checkEmailVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
