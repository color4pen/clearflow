import { eq, and, gte } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalSteps } from "../schema";
import type { ApprovalStep, ApprovalStepStatus } from "@/domain/models/approvalStep";

function mapRow(row: typeof approvalSteps.$inferSelect): ApprovalStep {
  return {
    id: row.id,
    requestId: row.requestId,
    stepOrder: row.stepOrder,
    approverRole: row.approverRole,
    status: row.status,
    approvedBy: row.approvedBy ?? null,
    approvedAt: row.approvedAt ?? null,
    comment: row.comment ?? null,
    organizationId: row.organizationId,
  };
}

export async function createMany(
  steps: Array<{
    requestId: string;
    stepOrder: number;
    approverRole: string;
    organizationId: string;
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
    .select()
    .from(approvalSteps)
    .where(
      and(
        eq(approvalSteps.requestId, requestId),
        eq(approvalSteps.organizationId, organizationId)
      )
    )
    .orderBy(approvalSteps.stepOrder);
  return result.map(mapRow);
}

export async function updateStatus(
  stepId: string,
  data: {
    status: ApprovalStepStatus;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    comment?: string | null;
  },
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
    })
    .where(eq(approvalSteps.id, stepId))
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
    })
    .where(
      and(
        eq(approvalSteps.requestId, requestId),
        eq(approvalSteps.organizationId, organizationId),
        gte(approvalSteps.stepOrder, fromStepOrder)
      )
    );
}
