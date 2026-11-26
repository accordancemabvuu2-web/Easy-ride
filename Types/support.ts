export type SupportCategory =
  | "account"
  | "listing"
  | "payment"
  | "verification"
  | "fraud"
  | "safety"
  | "technical"
  | "other";

export type SupportStatus = "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";

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
