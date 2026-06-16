import { db } from "../db";
import { auditLogs } from "../schema";
import type { AuditLog } from "@/domain/models/auditLog";

export async function create(data: {
  action: string;
  targetType: string;
  targetId: string;
  actorId: string;
  organizationId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<AuditLog> {
  const result = await db
    .insert(auditLogs)
    .values({
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      actorId: data.actorId,
      organizationId: data.organizationId,
      metadata: data.metadata ?? null,
    })
    .returning();
  const row = result[0];
  return {
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    actorId: row.actorId,
    organizationId: row.organizationId,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
  };
}
