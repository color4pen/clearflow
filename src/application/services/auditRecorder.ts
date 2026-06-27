import { auditLogRepository } from "@/infrastructure/repositories";
import type { Transaction } from "@/infrastructure/db";
import type {
  AuditAction,
  AuditTargetType,
  AuditMetadataMap,
  AuditLog,
} from "@/domain/models/auditLog";

export type AuditRecordParams<A extends AuditAction> = {
  action: A;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  organizationId: string;
} & (A extends keyof AuditMetadataMap
  ? { metadata: AuditMetadataMap[A] }
  : { metadata?: Record<string, unknown> | null });

export async function recordAudit<A extends AuditAction>(
  params: AuditRecordParams<A>,
  tx?: Transaction
): Promise<AuditLog> {
  return auditLogRepository.create(
    {
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      actorId: params.actorId,
      organizationId: params.organizationId,
      metadata: (params.metadata ?? null) as Record<string, unknown> | null,
    },
    tx
  );
}
