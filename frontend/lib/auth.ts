import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { connectMongo } from "@/lib/mongodb";
import { ProfileModel } from "@/models";

const COOKIE = "easy-ride-session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  return new TextEncoder().encode(value);
};

export async function setSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession() { (await cookies()).delete(COOKIE); }

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    await connectMongo();
    const user = await ProfileModel.findById(payload.sub).select("email display_name full_name phone avatar_url country_code role account_status staff_roles email_verified").lean();
    if (!user || user.account_status !== "active") return null;
    return user;
  } catch { return null; }
}

export const STAFF_ROLES = ["SUPPORT", "VERIFICATION", "ADMIN", "SUPER_ADMIN"] as const;
export async function isMasterAdmin(user: { staff_roles?: string[]; role?: string }) { return user.staff_roles?.includes("SUPER_ADMIN") ?? user.role === "admin"; }
export async function canReview(user: { staff_roles?: string[]; role?: string }) { return Boolean(user.role === "admin" || user.staff_roles?.some((role) => ["VERIFICATION", "ADMIN", "SUPER_ADMIN"].includes(role))); }
export async function isStaff(user: { staff_roles?: string[]; role?: string }) { return Boolean(user.role === "admin" || user.staff_roles?.some((role) => STAFF_ROLES.includes(role as typeof STAFF_ROLES[number]))); }

export function publicProfile(user: any) {
  return { id: String(user._id), display_name: user.display_name, full_name: user.full_name, email: user.email, phone: user.phone, avatar_url: user.avatar_url, country_code: user.country_code, role: user.role, account_status: user.account_status, created_at: user.created_at, updated_at: user.updated_at };
}
