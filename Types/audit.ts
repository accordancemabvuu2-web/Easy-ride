export type AuditAction =
  | "listing_approved"
  | "listing_rejected"
  | "listing_suspended"
  | "listing_restored"
  | "verification_approved"
  | "verification_rejected"
  | "user_suspended"
  | "report_resolved"
  | "support_ticket_updated";

export interface AuditLog {
  id: string;

  actorId: string;
  actorName: string;
  actorRole: string;

  action: AuditAction;

  targetType:
    | "listing"
    | "user"
    | "verification"
    | "report"
    | "support_ticket";

  targetId: string;

  description: string;
  metadata?: Record<string, unknown>;

  createdAt?: unknown;
}
