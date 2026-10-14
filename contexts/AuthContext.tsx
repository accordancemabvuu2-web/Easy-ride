"use client";

import { auth, db, firebaseReady } from "@/lib/firebase";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/browser";
import type { EasyRideUser, UserCapability, UserRole } from "@/Types/user";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "buyer" | "seller";
}

async function loadSupabaseProfile(user: SupabaseUser): Promise<EasyRideUser> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,phone,avatar_url,role,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Could not load your profile: ${error.message}`);

  return normalizeProfile({
    id: user.id,
    name: data?.full_name || user.user_metadata.full_name || "Easy Ride User",
    email: user.email ?? "",
    phone: data?.phone ?? "",
    role: data?.role ?? "buyer",
    roles: [data?.role ?? "buyer"],
    capabilities: capabilitiesForRole(data?.role ?? "buyer"),
    photoURL: data?.avatar_url ?? user.user_metadata.avatar_url ?? "",
    createdAt: data?.created_at ?? user.created_at,
  });
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: EasyRideUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAccountRole: (role: "buyer" | "seller", phone?: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}

const AUTH_CACHE_KEY = "easy-ride:auth-profile";
const AUTH_SESSION_KEY = "easy-ride:auth-session";
const DEMO_ADMIN_EMAIL = "admin@easyride.local";
const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_PROFILE: EasyRideUser = {
  id: "local-admin",
  name: "Easy Ride Admin",
  email: DEMO_ADMIN_EMAIL,
  phone: "",
  role: "admin",
  roles: ["admin"],
  capabilities: ["buy", "rent", "sell", "dealer"],
  photoURL: "",
  createdAt: new Date().toISOString(),
};
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

function readSessionProfile(): EasyRideUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EasyRideUser;
  } catch {
    return null;
  }
}

function writeSessionProfile(profile: EasyRideUser | null) {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
}

async function loadFirebaseProfile(user: User): Promise<EasyRideUser | null> {
  if (!db) {
    return readCachedProfile();
  }

  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeProfile({
    id: snapshot.id,
    ...(snapshot.data() as Omit<EasyRideUser, "id">),
  });
}

async function persistFallbackProfile(profile: EasyRideUser) {
  writeCachedProfile(profile);
  writeSessionProfile(profile);
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EasyRideUser | null>(() =>
    auth ? null : readSessionProfile(),
  );
  const [loading, setLoading] = useState(() => Boolean(auth || supabase));

  useEffect(() => {
    if (supabase) {
      let active = true;
      void supabase.auth.getUser().then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          setProfile(null);
        } else if (data.user) {
          setProfile(await loadSupabaseProfile(data.user));
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }
        void loadSupabaseProfile(session.user).then((nextProfile) => {
          if (active) setProfile(nextProfile);
          setLoading(false);
        });
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }

    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        const userProfile = await loadFirebaseProfile(user);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });
  }, [supabase]);

  const register = async ({
    name,
    email,
    password,
    phone = "",
    role = "buyer",
  }: RegisterInput) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), phone },
          emailRedirectTo:
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/auth/callback?next=/register`,
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Supabase did not create the account.");

      const nextProfile = data.session
        ? await loadSupabaseProfile(data.user)
        : normalizeProfile({
            id: data.user.id,
            name,
            email: email.trim().toLowerCase(),
            phone,
            role,
            roles: [role],
            capabilities: capabilitiesForRole(role),
            photoURL: "",
            createdAt: data.user.created_at,
          });
      setProfile(nextProfile);
      return;
    }

    if (!auth || !db) {
      const fallbackProfile: EasyRideUser = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        role,
        roles: [role],
        capabilities: capabilitiesForRole(role),
        photoURL: "",
        createdAt: new Date().toISOString(),
      };

      await persistFallbackProfile(fallbackProfile);
      setProfile(fallbackProfile);
      return;
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, {
      displayName: name,
    });
    await sendEmailVerification(credential.user);

    const userProfile: Omit<EasyRideUser, "id"> = {
      name,
      email,
      phone,
      role,
      roles: [role],
      capabilities: capabilitiesForRole(role),
      photoURL: credential.user.photoURL ?? "",
      createdAt: Timestamp.now().toDate().toISOString(),
    };

    await setDoc(doc(db, "users", credential.user.uid), userProfile);

    setProfile({
      id: credential.user.uid,
        ...userProfile,
    });
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (
      normalizedEmail === DEMO_ADMIN_EMAIL &&
      normalizedPassword === DEMO_ADMIN_PASSWORD
    ) {
      await persistFallbackProfile(DEMO_ADMIN_PROFILE);
      setProfile(DEMO_ADMIN_PROFILE);
      return;
    }

    if (!auth || !db) {
      const cached = readCachedProfile();
      if (!cached || cached.email.toLowerCase() !== normalizedEmail) {
        throw new Error(
          "Firebase is not configured yet. Set your .env.local values to enable email login."
        );
      }

      writeSessionProfile(cached);
      setProfile(cached);
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user) {
      setProfile(await loadFirebaseProfile(user));
    }
  };

  const loginWithGoogle = async () => {
    if (supabase) {
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (next?.startsWith("/") && !next.startsWith("//")) {
        callbackUrl.searchParams.set("next", next);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (!auth || !db) {
      const fallbackProfile: EasyRideUser = {
        id: crypto.randomUUID(),
        name: "Easy Ride User",
        email: "guest@easyride.local",
        phone: "",
        role: "buyer",
        roles: ["buyer"],
        capabilities: capabilitiesForRole("buyer"),
        photoURL: "",
        createdAt: new Date().toISOString(),
      };

      await persistFallbackProfile(fallbackProfile);
      setProfile(fallbackProfile);
      return;
    }

    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);

    const userReference = doc(db, "users", credential.user.uid);
    const snapshot = await getDoc(userReference);

    if (!snapshot.exists()) {
      await setDoc(userReference, {
        name: credential.user.displayName ?? "Easy Ride User",
        email: credential.user.email ?? "",
        phone: "",
        role: "buyer" as UserRole,
        roles: ["buyer"] as UserRole[],
        capabilities: capabilitiesForRole("buyer"),
        photoURL: credential.user.photoURL ?? "",
        createdAt: Timestamp.now().toDate().toISOString(),
      });
    }

    setProfile(await loadFirebaseProfile(credential.user));
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      setProfile(null);
      window.location.replace("/");
      return;
    }

    if (!auth) {
      writeCachedProfile(null);
      writeSessionProfile(null);
      setProfile(null);
      window.location.replace("/");
      return;
    }

    await signOut(auth);
    writeCachedProfile(null);
    setProfile(null);
    window.location.replace("/");
  };

  const refreshProfile = async () => {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw new Error(error.message);
      setProfile(data.user ? await loadSupabaseProfile(data.user) : null);
      return;
    }

    if (!auth || !auth.currentUser) {
      setProfile(readSessionProfile());
      return;
    }

    setProfile(await loadFirebaseProfile(auth.currentUser));
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

      if (supabase) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: updatedProfile.name,
            phone: updatedProfile.phone,
            role,
          })
          .eq("id", updatedProfile.id);
        if (error) throw new Error(`Could not update your profile: ${error.message}`);
      } else if (db && auth?.currentUser) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            role,
            roles: [role],
            capabilities: capabilitiesForRole(role),
            ...(phone === undefined ? {} : { phone }),
          },
          { merge: true },
        );
      }

      await persistFallbackProfile(updatedProfile);
      setProfile(updatedProfile);
    },
    [profile, supabase],
  );

  const sendVerificationEmail = async () => {
    if (supabase) {
      if (!profile) return;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: profile.email,
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (auth?.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const checkEmailVerification = async () => {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (error.message.toLowerCase().includes("auth session missing")) {
          return false;
        }
        throw new Error(error.message);
      }
      return Boolean(data.user?.email_confirmed_at);
    }

    if (!auth?.currentUser) return true;
    await auth.currentUser.reload();
    return auth.currentUser.emailVerified;
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      firebaseEnabled: firebaseReady || isSupabaseConfigured(),
      register,
      login,
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
