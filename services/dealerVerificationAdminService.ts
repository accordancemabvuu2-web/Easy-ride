import { api } from "@/lib/apiClient";

export interface DealerApplication {
  id: string;
  userId: string;
  businessName: string;
  businessRegistrationNumber: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string | null;
}

export interface DealerApplicationsPage {
  applications: DealerApplication[];
  page: number;
  pageSize: number;
  total: number;
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return typeof value === "object" && value !== null ? value as RecordValue : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseDealer(value: unknown): DealerApplication {
  const dealer = asRecord(value);
  const id = dealer._id ?? dealer.id;
  const userId = dealer.userId;
  if (typeof id !== "string" || typeof userId !== "string" || typeof dealer.businessName !== "string") {
    throw new Error("The dealer verification response was invalid.");
  }

  return {
    id,
    userId,
    businessName: dealer.businessName,
    businessRegistrationNumber: nullableString(dealer.businessRegistrationNumber),
    description: nullableString(dealer.description),
    contactEmail: nullableString(dealer.contactEmail),
    contactPhone: nullableString(dealer.contactPhone),
    createdAt: nullableString(dealer.createdAt),
  };
}

export async function getPendingDealerApplications(
  page = 1,
  pageSize = 100,
): Promise<DealerApplicationsPage> {
  const response = await api.get<unknown>(
    "/admin/dealers?status=pending&page=" + page + "&pageSize=" + pageSize,
  );
  if (!Array.isArray(response.data)) {
    throw new Error("The dealer verification response was invalid.");
  }

  const meta = asRecord(response.meta);
  const total = meta.total;
  const responsePage = meta.page;
  const responsePageSize = meta.pageSize;
  if (
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    responsePage !== page ||
    responsePageSize !== pageSize
  ) {
    throw new Error("The dealer verification pagination was invalid.");
  }

  return {
    applications: response.data.map(parseDealer),
    page,
    pageSize,
    total,
  };
}

export async function reviewDealerApplication(
  dealerId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<void> {
  if (!/^[0-9a-f]{24}$/i.test(dealerId)) {
    throw new Error("The dealer application ID is invalid.");
  }
  const normalizedReason = reason?.trim();
  if (decision === "reject" && !normalizedReason) {
    throw new Error("A reason is required when rejecting an application.");
  }
  if (normalizedReason && normalizedReason.length > 1000) {
    throw new Error("The review reason must be 1,000 characters or fewer.");
  }

  await api.patch(
    "/admin/dealers/" + encodeURIComponent(dealerId) + "/review",
    { decision, ...(normalizedReason ? { reason: normalizedReason } : {}) },
  );
}
