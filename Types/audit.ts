// The backend audit vocabulary grows with audited server operations.
export type AuditAction = string;

export interface AuditLog {
  id: string;

  actorId: string;
  actorName: string;
  actorRole: string;

  action: AuditAction;

  targetType: string;

  targetId: string;

  description: string;
  metadata?: Record<string, unknown>;

  createdAt?: unknown;
}
