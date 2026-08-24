"use client";

import { auth, db, firebaseReady } from "@/lib/firebase";
import type { EasyRideUser, UserRole } from "@/Types/user";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  firebaseUser: User | null;
  profile: EasyRideUser | null;
  loading: boolean;
  firebaseEnabled: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AUTH_CACHE_KEY = "easy-ride:auth-profile";
const DEMO_ADMIN_EMAIL = "admin@easyride.local";
const DEMO_ADMIN_PASSWORD = "admin123";
const DEMO_ADMIN_PROFILE: EasyRideUser = {
  id: "local-admin",
  name: "Easy Ride Admin",
  email: DEMO_ADMIN_EMAIL,
  phone: "",
  role: "admin",
  photoURL: "",
  createdAt: new Date().toISOString(),
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

async function loadProfile(user: User): Promise<EasyRideUser | null> {
  if (!db) {
    return readCachedProfile();
  }

  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<EasyRideUser, "id">),
  };
}

async function persistFallbackProfile(profile: EasyRideUser) {
  writeCachedProfile(profile);
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EasyRideUser | null>(() =>
    auth ? null : readCachedProfile(),
  );
  const [loading, setLoading] = useState(() => Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        const userProfile = await loadProfile(user);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });
  }, []);

  const register = async ({
    name,
    email,
    password,
    phone = "",
    role = "buyer",
  }: RegisterInput) => {
    if (!auth || !db) {
      const fallbackProfile: EasyRideUser = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        role,
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

    const userProfile: Omit<EasyRideUser, "id"> = {
      name,
      email,
      phone,
      role,
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
    if (!auth || !db) {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      if (
        normalizedEmail === DEMO_ADMIN_EMAIL &&
        normalizedPassword === DEMO_ADMIN_PASSWORD
      ) {
        await persistFallbackProfile(DEMO_ADMIN_PROFILE);
        setProfile(DEMO_ADMIN_PROFILE);
        return;
      }

      const cached = readCachedProfile();
      if (!cached || cached.email.toLowerCase() !== normalizedEmail) {
        throw new Error(
          "Firebase is not configured yet. Set your .env.local values to enable email login."
        );
      }

      setProfile(cached);
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user) {
      setProfile(await loadProfile(user));
    }
  };

  const loginWithGoogle = async () => {
    if (!auth || !db) {
      const fallbackProfile: EasyRideUser = {
        id: crypto.randomUUID(),
        name: "Easy Ride User",
        email: "guest@easyride.local",
        phone: "",
        role: "buyer",
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
        photoURL: credential.user.photoURL ?? "",
        createdAt: Timestamp.now().toDate().toISOString(),
      });
    }

    setProfile(await loadProfile(credential.user));
  };

  const logout = async () => {
    if (!auth) {
      writeCachedProfile(null);
      setProfile(null);
      return;
    }

    await signOut(auth);
    writeCachedProfile(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!auth || !auth.currentUser) {
      setProfile(readCachedProfile());
      return;
    }

    setProfile(await loadProfile(auth.currentUser));
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      firebaseEnabled: firebaseReady,
      register,
      login,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [firebaseUser, profile, loading]
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
