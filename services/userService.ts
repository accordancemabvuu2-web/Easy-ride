import { api } from "@/lib/apiClient";
import type { UserRole } from "@/Types/user";

export async function updateUserRole(
  _userId: string,
  role: UserRole
): Promise<void> {
  if (role === "seller") {
    await api.post("/auth/activate-seller");
  }
}

export async function updateCurrentUserProfile(payload: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  preferredCurrency?: string;
  preferredLanguage?: string;
}): Promise<void> {
  await api.patch("/users/me", payload);
}
