import { auditLogRepository } from "@/infrastructure/repositories";
import type { AuditLog } from "@/domain/models/auditLog";

export async function getRecentActivities(
  organizationId: string
): Promise<AuditLog[]> {
  return auditLogRepository.findByOrganization(organizationId, { limit: 20 });
}
