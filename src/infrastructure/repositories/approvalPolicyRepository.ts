import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalPolicies } from "../schema";
import type { ApprovalPolicy, ConditionOperator } from "@/domain/models/approvalPolicy";

const CONDITION_OPERATORS: ReadonlySet<ConditionOperator> = new Set([
  "gt",
  "gte",
  "lt",
  "lte",
  "eq",
  "neq",
  "in",
]);

type PolicyRow = typeof approvalPolicies.$inferSelect;

function mapRow(row: PolicyRow): ApprovalPolicy {
  if (
    row.conditionOperator !== null &&
    !CONDITION_OPERATORS.has(row.conditionOperator as ConditionOperator)
  ) {
    throw new Error(`Invalid conditionOperator: ${row.conditionOperator}`);
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description ?? null,
    triggerAction: row.triggerAction,
    conditionField: row.conditionField ?? null,
    conditionOperator: row.conditionOperator as ConditionOperator | null,
    conditionValue: row.conditionValue ?? null,
    templateId: row.templateId,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function create(
  data: {
    organizationId: string;
    name: string;
    description?: string | null;
    triggerAction: string;
    conditionField?: string | null;
    conditionOperator?: ConditionOperator | null;
    conditionValue?: string | null;
    templateId: string;
    isActive?: boolean;
  },
  tx?: Transaction
): Promise<ApprovalPolicy> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(approvalPolicies)
    .values({
      organizationId: data.organizationId,
      name: data.name,
      description: data.description ?? null,
      triggerAction: data.triggerAction,
      conditionField: data.conditionField ?? null,
      conditionOperator: data.conditionOperator ?? null,
      conditionValue: data.conditionValue ?? null,
      templateId: data.templateId,
      isActive: data.isActive ?? true,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<ApprovalPolicy | null> {
  const result = await db
    .select()
    .from(approvalPolicies)
    .where(
      and(
        eq(approvalPolicies.id, id),
        eq(approvalPolicies.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findByOrganization(
  organizationId: string
): Promise<ApprovalPolicy[]> {
  const result = await db
    .select()
    .from(approvalPolicies)
    .where(eq(approvalPolicies.organizationId, organizationId))
    .orderBy(desc(approvalPolicies.createdAt));
  return result.map(mapRow);
}

/**
 * Find active policies matching the given organizationId and triggerAction.
 * Only returns policies where isActive = true (tenant-isolated).
 */
export async function findActiveByTriggerAction(
  organizationId: string,
  triggerAction: string
): Promise<ApprovalPolicy[]> {
  const result = await db
    .select()
    .from(approvalPolicies)
    .where(
      and(
        eq(approvalPolicies.organizationId, organizationId),
        eq(approvalPolicies.triggerAction, triggerAction),
        eq(approvalPolicies.isActive, true)
      )
    )
    .orderBy(asc(approvalPolicies.createdAt));
  return result.map(mapRow);
}

export async function updateById(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string | null;
    triggerAction: string;
    conditionField: string | null;
    conditionOperator: ConditionOperator | null;
    conditionValue: string | null;
    templateId: string;
    isActive: boolean;
  }>,
  tx?: Transaction
): Promise<ApprovalPolicy | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(approvalPolicies)
    .set(data)
    .where(
      and(
        eq(approvalPolicies.id, id),
        eq(approvalPolicies.organizationId, organizationId)
      )
    )
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function deleteById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .delete(approvalPolicies)
    .where(
      and(
        eq(approvalPolicies.id, id),
        eq(approvalPolicies.organizationId, organizationId)
      )
    );
}
