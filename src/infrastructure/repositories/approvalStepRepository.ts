import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalSteps, requests, users } from "../schema";
import type { ApprovalStep, ApprovalStepStatus } from "@/domain/models/approvalStep";

function mapRow(row: typeof approvalSteps.$inferSelect): ApprovalStep {
  return {
    id: row.id,
    requestId: row.requestId,
    stepOrder: row.stepOrder,
    approverRole: row.approverRole,
    status: row.status,
    approvedBy: row.approvedBy ?? null,
    approvedByName: null,
    approvedAt: row.approvedAt ?? null,
    comment: row.comment ?? null,
    organizationId: row.organizationId,
    version: row.version,
    deadline: row.deadline ?? null,
  };
}

export async function createMany(
  steps: Array<{
    requestId: string;
    stepOrder: number;
    approverRole: string;
    organizationId: string;
    deadline?: Date | null;
  }>,
  tx?: Transaction
): Promise<ApprovalStep[]> {
  if (steps.length === 0) return [];
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(approvalSteps)
    .values(
      steps.map((s) => ({
        requestId: s.requestId,
        stepOrder: s.stepOrder,
        approverRole: s.approverRole,
        organizationId: s.organizationId,
        status: "pending" as const,
        deadline: s.deadline ?? null,
      }))
    )
    .returning();
  return result.map(mapRow);
}

export async function findByRequestId(
  requestId: string,
  organizationId: string,
  tx?: Transaction
): Promise<ApprovalStep[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select({
      step: approvalSteps,
      approverName: users.name,
    })
    .from(approvalSteps)
    .leftJoin(users, eq(approvalSteps.approvedBy, users.id))
    .where(
      and(
        eq(approvalSteps.requestId, requestId),
        eq(approvalSteps.organizationId, organizationId)
      )
    )
    .orderBy(approvalSteps.stepOrder);
  return result.map((row) => ({
    ...mapRow(row.step),
    approvedByName: row.approverName ?? null,
  }));
}

export async function updateStatus(
  stepId: string,
  organizationId: string,
  data: {
    status: ApprovalStepStatus;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    comment?: string | null;
  },
  expectedVersion: number,
  tx?: Transaction
): Promise<ApprovalStep | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(approvalSteps)
    .set({
      status: data.status,
      approvedBy: data.approvedBy ?? null,
      approvedAt: data.approvedAt ?? null,
      comment: data.comment ?? null,
      version: sql`version + 1`,
    })
    .where(
      and(
        eq(approvalSteps.id, stepId),
        eq(approvalSteps.organizationId, organizationId),
        eq(approvalSteps.version, expectedVersion)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function resetSteps(
  requestId: string,
  fromStepOrder: number,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .update(approvalSteps)
    .set({
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      comment: null,
      version: sql`version + 1`,
    })
    .where(
      and(
        eq(approvalSteps.requestId, requestId),
        eq(approvalSteps.organizationId, organizationId),
        gte(approvalSteps.stepOrder, fromStepOrder)
      )
    );
}

export async function findOverdueRequestIds(
  tx?: Transaction
): Promise<Array<{ requestId: string; organizationId: string }>> {
  const queryRunner = tx ?? db;
  const now = new Date();
  const result = await queryRunner
    .selectDistinct({
      requestId: approvalSteps.requestId,
      organizationId: approvalSteps.organizationId,
    })
    .from(approvalSteps)
    .innerJoin(requests, eq(approvalSteps.requestId, requests.id))
    .where(
      and(
        eq(approvalSteps.status, "pending"),
        lt(approvalSteps.deadline, now),
        eq(requests.status, "pending")
      )
    );
  return result;
}
