import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { requests, auditLogs, approvalSteps } from "../schema";
import type { Request, RequestStatus, RequestWithSteps } from "@/domain/models/request";
import type { OriginType } from "@/domain/models/approvalPolicy";


function mapRow(row: typeof requests.$inferSelect): Request {
  return {
    id: row.id,
    title: row.title,
    formData: (row.formData ?? {}) as Record<string, { value: unknown; label: string }>,
    templateId: row.templateId ?? null,
    status: row.status,
    organizationId: row.organizationId,
    creatorId: row.creatorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
    originType: row.originType as OriginType,
    originPolicyId: row.originPolicyId ?? null,
    originTriggerAction: row.originTriggerAction ?? null,
    originTriggerEntityId: row.originTriggerEntityId ?? null,
  };
}

export async function create(
  data: {
    title: string;
    formData: Record<string, unknown>;
    templateId?: string | null;
    organizationId: string;
    creatorId: string;
    status?: RequestStatus;
    originType?: OriginType;
    originPolicyId?: string | null;
    originTriggerAction?: string | null;
    originTriggerEntityId?: string | null;
  },
  tx?: Transaction
): Promise<Request> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(requests)
    .values({
      title: data.title,
      formData: data.formData,
      templateId: data.templateId ?? null,
      status: data.status ?? "draft",
      organizationId: data.organizationId,
      creatorId: data.creatorId,
      originType: data.originType ?? "manual",
      originPolicyId: data.originPolicyId ?? null,
      originTriggerAction: data.originTriggerAction ?? null,
      originTriggerEntityId: data.originTriggerEntityId ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

/**
 * Returns true if there is at least one pending request that was created
 * using the given template. This is determined by joining audit_logs
 * (action = 'request.create', metadata.templateId = templateId) with requests
 * (status = 'pending'). Both tables are filtered by organizationId for
 * tenant isolation.
 *
 * @note Depends on audit_logs.metadata having a `templateId` field set by
 *       the createRequest usecase.
 */
export async function existsPendingByTemplateId(
  templateId: string,
  organizationId: string
): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .innerJoin(
      requests,
      sql`${requests.id}::text = ${auditLogs.targetId}`
    )
    .where(
      and(
        eq(auditLogs.action, "request.create"),
        sql`${auditLogs.metadata}->>'templateId' = ${templateId}`,
        eq(auditLogs.organizationId, organizationId),
        eq(requests.status, "pending"),
        eq(requests.organizationId, organizationId)
      )
    );
  return (result[0]?.count ?? 0) > 0;
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Request | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Request[]> {
  const result = await db
    .select()
    .from(requests)
    .where(eq(requests.organizationId, organizationId))
    .orderBy(requests.createdAt);
  return result.map(mapRow);
}

export async function findAllWithStepsByOrganization(
  organizationId: string
): Promise<RequestWithSteps[]> {
  const rows = await db
    .select({
      request: requests,
      stepApproverRole: approvalSteps.approverRole,
      stepStatus: approvalSteps.status,
      stepDeadline: approvalSteps.deadline,
      stepOrder: approvalSteps.stepOrder,
    })
    .from(requests)
    .leftJoin(
      approvalSteps,
      and(
        eq(approvalSteps.requestId, requests.id),
        eq(approvalSteps.organizationId, requests.organizationId)
      )
    )
    .where(eq(requests.organizationId, organizationId))
    .orderBy(requests.createdAt, approvalSteps.stepOrder);

  // Group rows by requestId
  const map = new Map<string, RequestWithSteps>();
  for (const row of rows) {
    const req = row.request;
    if (!map.has(req.id)) {
      map.set(req.id, {
        ...mapRow(req),
        approvalSteps: [],
      });
    }
    if (row.stepApproverRole !== null && row.stepStatus !== null) {
      map.get(req.id)!.approvalSteps.push({
        approverRole: row.stepApproverRole,
        status: row.stepStatus,
        deadline: row.stepDeadline ?? null,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Finds an existing system-generated approval request for the given trigger
 * entity that is still in progress (status = draft or pending). Used to
 * prevent duplicate approval requests for the same entity.
 */
export async function findByOriginTriggerEntity(
  organizationId: string,
  triggerAction: string,
  triggerEntityId: string
): Promise<Request | null> {
  const result = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.organizationId, organizationId),
        eq(requests.originType, "system"),
        eq(requests.originTriggerAction, triggerAction),
        eq(requests.originTriggerEntityId, triggerEntityId),
        inArray(requests.status, ["draft", "pending"])
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function updateStatus(
  id: string,
  organizationId: string,
  status: RequestStatus,
  updatedAt: Date,
  expectedVersion: number,
  tx?: Transaction
): Promise<Request | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(requests)
    .set({ status, updatedAt, version: sql`version + 1` })
    .where(
      and(
        eq(requests.id, id),
        eq(requests.organizationId, organizationId),
        eq(requests.version, expectedVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}
