export type VerificationType = "identity" | "vehicle_ownership" | "vehicle_history";

export type VerificationStatus = "pending" | "approved" | "rejected" | "unavailable";

export interface VerificationRequest {
  id: string;
  userId?: string;
  type: VerificationType;
  status: VerificationStatus;
  vehicleId?: string;
  notes?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

