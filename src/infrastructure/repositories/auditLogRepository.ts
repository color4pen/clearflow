import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { auditLogs } from "../schema";
import type { AuditLog } from "@/domain/models/auditLog";

export async function create(
  data: {
    action: string;
    targetType: string;
    targetId: string;
    actorId: string;
    organizationId: string;
    metadata?: Record<string, unknown> | null;
  },
  tx?: Transaction
): Promise<AuditLog> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
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

export async function findByOrganization(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    actorId?: string;
    targetType?: string;
  }
): Promise<AuditLog[]> {
  const conditions = [eq(auditLogs.organizationId, organizationId)];

  if (options?.startDate) {
    conditions.push(gte(auditLogs.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(auditLogs.createdAt, options.endDate));
  }
  if (options?.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options?.actorId) {
    conditions.push(eq(auditLogs.actorId, options.actorId));
  }
  if (options?.targetType) {
    conditions.push(eq(auditLogs.targetType, options.targetType));
  }

  let query = db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt));

  if (options?.limit !== undefined) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset) as typeof query;
  }

  const result = await query;
  return result.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    actorId: row.actorId,
    organizationId: row.organizationId,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
  }));
}
