import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { approvalTemplates } from "../schema";
import type { ApprovalTemplate, ApprovalTemplateStep, TemplateField } from "@/domain/models/approvalTemplate";

function mapRow(row: typeof approvalTemplates.$inferSelect): ApprovalTemplate {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    steps: row.steps as ApprovalTemplateStep[],
    fields: (row.fields ?? []) as TemplateField[],
    createdAt: row.createdAt,
  };
}

export async function findByOrganization(
  organizationId: string
): Promise<ApprovalTemplate[]> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(eq(approvalTemplates.organizationId, organizationId));
  return result.map(mapRow);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<ApprovalTemplate | null> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

/**
 * Creates a new approval template and returns the persisted record.
 */
export async function create(
  data: {
    name: string;
    organizationId: string;
    steps: ApprovalTemplateStep[];
    fields?: TemplateField[];
  },
  tx?: Transaction
): Promise<ApprovalTemplate> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(approvalTemplates)
    .values({
      name: data.name,
      organizationId: data.organizationId,
      steps: data.steps,
      fields: data.fields ?? [],
    })
    .returning();
  return mapRow(result[0]);
}

export async function updateById(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    steps?: ApprovalTemplateStep[];
    fields?: TemplateField[];
  },
  tx?: Transaction
): Promise<ApprovalTemplate | null> {
  const queryRunner = tx ?? db;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.steps !== undefined) updateData.steps = data.steps;
  if (data.fields !== undefined) updateData.fields = data.fields;

  const result = await queryRunner
    .update(approvalTemplates)
    .set(updateData)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
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
    .delete(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
      )
    );
}
