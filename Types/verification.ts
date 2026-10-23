export type VerificationType = "identity" | "private_seller" | "dealer";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;

  type: VerificationType;
  status: VerificationStatus;

  identityDocumentUrl?: string;
  businessDocumentUrl?: string;
  proofOfAddressUrl?: string;

  notes?: string;
  rejectionReason?: string;

  submittedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
}
