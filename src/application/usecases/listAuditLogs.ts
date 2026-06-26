import { auditLogRepository } from "@/infrastructure/repositories";
import type { AuditLog } from "@/domain/models/auditLog";

export async function listAuditLogs(data: {
  organizationId: string;
  filters?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    actorId?: string;
    targetType?: string;
  };
}): Promise<AuditLog[]> {
  return auditLogRepository.findByOrganization(data.organizationId, data.filters);
}
