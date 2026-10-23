export type SupportCategory =
  | "account"
  | "listing"
  | "payment"
  | "verification"
  | "fraud"
  | "technical"
  | "other";

export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;

  subject: string;
  category: SupportCategory;
  description: string;

  status: SupportStatus;
  priority: "low" | "medium" | "high" | "urgent";

  assignedTo?: string;
  adminResponse?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}
