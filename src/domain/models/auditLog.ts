export type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorId: string;
  organizationId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};
